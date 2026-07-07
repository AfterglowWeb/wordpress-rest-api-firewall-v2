<?php 
namespace Bromate\RestApiFirewall\Security\Login;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Logs\FirewallLogger;
use WP_User;
use WP_Error;

final class TOTPLoginService {

	private const SESSION_VERIFIED_META_KEY = '_bromate_totp_session_verified';
	private const TRUSTED_COOKIE_NAME = 'bromate_totp_trusted';
	private const PENDING_TRANSIENT_PREFIX = 'bromate_totp_pending_';
	private const MAX_ATTEMPTS = 5;
	private const TRANSIENT_EXPIRY = 300; // 5 minutes
	private const VERIFICATION_ACTION = 'bromate_totp_verify';

	private TOTPRepository $totp_repo;

	public function __construct() {
		$this->totp_repo = new TOTPRepository();
	}

	public static function register(): void {
		$service = new self();

		// Hook into login redirect to intercept before redirect
		add_filter( 'login_redirect', array( $service, 'intercept_login_redirect' ), 10, 3 );
		
		// Handle 2FA verification submission
		add_action( 'login_form_' . self::VERIFICATION_ACTION, array( $service, 'handle_verification_request' ) );
		
		// AJAX handler for verification
		add_action( 'wp_ajax_bromate_verify_login_totp', array( $service, 'ajax_verify_login_totp' ) );
		add_action( 'wp_ajax_nopriv_bromate_verify_login_totp', array( $service, 'ajax_verify_login_totp' ) );
		
		// Clear session on logout
		add_action( 'wp_logout', array( $service, 'clear_session_verification' ) );
		
		// Check for pending verification on admin pages
		add_action( 'admin_init', array( $service, 'check_pending_verification' ) );
		
		// Prevent redirect loop by checking if we're already on the verification page
		add_action( 'login_init', array( $service, 'maybe_skip_verification_redirect' ) );
	}

	/**
	 * Skip verification redirect if already on the verification page
	 */
	public function maybe_skip_verification_redirect(): void {
		if ( isset( $_GET['action'] ) && $_GET['action'] === self::VERIFICATION_ACTION ) {
			// We're already on the verification page, don't redirect again
			return;
		}
	}

	/**
	 * Intercept login redirect to check for 2FA
	 */
	public function intercept_login_redirect( string $redirect_to, string $requested_redirect_to, $user ): string {
		// Skip if user is not logged in or not a WP_User object
		if ( ! $user instanceof WP_User ) {
			return $redirect_to;
		}

		// Skip if already on verification page (should not happen, but just in case)
		if ( isset( $_GET['action'] ) && $_GET['action'] === self::VERIFICATION_ACTION ) {
			return $redirect_to;
		}

		// Check if TOTP is globally enabled
		if ( ! $this->is_totp_globally_enabled() ) {
			return $redirect_to;
		}

		// Check if user has TOTP enabled
		if ( ! $this->totp_repo->is_totp_enabled( $user->ID ) ) {
			return $redirect_to;
		}

		// Check if this is a trusted device (remember me)
		if ( $this->is_trusted_device( $user->ID ) ) {
			return $redirect_to;
		}

		// Check if session is already verified
		if ( get_user_meta( $user->ID, self::SESSION_VERIFIED_META_KEY, true ) ) {
			return $redirect_to;
		}

		// Check if there's already a pending verification for this session
		$session_id = $this->get_session_id();
		$pending = get_transient( self::PENDING_TRANSIENT_PREFIX . $session_id );
		
		// If there's already a pending verification, reuse it
		if ( $pending && isset( $pending['user_id'] ) && (int) $pending['user_id'] === $user->ID ) {
			// Reuse existing session
		} else {
			// Store pending login data
			set_transient(
				self::PENDING_TRANSIENT_PREFIX . $session_id,
				array(
					'user_id'     => $user->ID,
					'login_time'  => time(),
					'username'    => $user->user_login,
					'redirect_to' => $redirect_to,
				),
				self::TRANSIENT_EXPIRY
			);
		}

		// Redirect to 2FA verification page
		return add_query_arg(
			array(
				'action'  => self::VERIFICATION_ACTION,
				'session' => $session_id,
			),
			wp_login_url()
		);
	}

	/**
	 * Handle verification request (non-AJAX)
	 */
	public function handle_verification_request(): void {
		// Check if already logged in
		if ( is_user_logged_in() ) {
			// Check if session is verified
			$user_id = get_current_user_id();
			if ( get_user_meta( $user_id, self::SESSION_VERIFIED_META_KEY, true ) ) {
				wp_redirect( admin_url() );
				exit;
			}
		}

		$session_id = isset( $_GET['session'] ) ? sanitize_text_field( wp_unslash( $_GET['session'] ) ) : '';
		
		// If no session ID, redirect to login
		if ( empty( $session_id ) ) {
			wp_redirect( wp_login_url() );
			exit;
		}

		$pending = get_transient( self::PENDING_TRANSIENT_PREFIX . $session_id );

		// Verify session exists
		if ( ! $pending || ! isset( $pending['user_id'] ) ) {
			wp_die(
				__( 'Invalid or expired verification session. Please log in again.', 'bromate-rest-api-firewall' ),
				__( 'Session Error', 'bromate-rest-api-firewall' ),
				array( 'response' => 401 )
			);
		}

		// Handle form submission
		if ( isset( $_POST['bromate_totp_code'] ) ) {
			$this->process_verification_form( $session_id );
			return;
		}

		// Render the form
		$username = isset( $pending['username'] ) ? $pending['username'] : '';
		$this->render_verification_form( $username, $session_id );
		exit;
	}

	/**
	 * Process verification form submission
	 */
	private function process_verification_form( string $session_id ): void {
		// Verify nonce
		if ( ! isset( $_POST['bromate_totp_nonce'] ) || 
			 ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['bromate_totp_nonce'] ) ), 'bromate_totp_login_verify' ) ) {
			wp_die( __( 'Invalid security token.', 'bromate-rest-api-firewall' ), 403 );
		}

		$code = isset( $_POST['bromate_totp_code'] ) ? sanitize_text_field( wp_unslash( $_POST['bromate_totp_code'] ) ) : '';
		$code = preg_replace( '/[^0-9]/', '', $code );

		if ( strlen( $code ) !== 6 ) {
			wp_die( __( 'Please enter a valid 6-digit code.', 'bromate-rest-api-firewall' ), 400 );
		}

		$remember = isset( $_POST['bromate_totp_remember'] );

		// Process via AJAX internally
		$_POST['code'] = $code;
		$_POST['session_id'] = $session_id;
		$_POST['remember_device'] = $remember ? '1' : '0';
		$_POST['nonce'] = wp_create_nonce( 'bromate_totp_login_verify' );

		// This will output the AJAX response
		$this->ajax_verify_login_totp();
		exit;
	}

	/**
	 * AJAX handler for TOTP verification
	 */
	public function ajax_verify_login_totp(): void {
		// Verify nonce
		if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'bromate_totp_login_verify' ) ) {
			wp_send_json_error( array( 'message' => 'Invalid security token' ), 403 );
			return;
		}

		// Validate inputs
		$code = isset( $_POST['code'] ) ? sanitize_text_field( wp_unslash( $_POST['code'] ) ) : '';
		$code = preg_replace( '/[^0-9]/', '', $code );
		
		if ( strlen( $code ) !== 6 ) {
			wp_send_json_error( array( 'message' => 'Invalid verification code format' ), 400 );
			return;
		}

		$session_id = isset( $_POST['session_id'] ) ? sanitize_text_field( wp_unslash( $_POST['session_id'] ) ) : '';
		if ( empty( $session_id ) ) {
			wp_send_json_error( array( 'message' => 'Missing session ID' ), 400 );
			return;
		}

		// Get pending login data
		$pending = get_transient( self::PENDING_TRANSIENT_PREFIX . $session_id );
		if ( ! $pending || ! isset( $pending['user_id'] ) ) {
			wp_send_json_error( array( 'message' => 'Session expired or invalid' ), 401 );
			return;
		}

		$user_id = (int) $pending['user_id'];
		$verified = false;

		// Try TOTP code
		if ( $this->totp_repo->verify_totp_code_for_login( $user_id, $code ) ) {
			$verified = true;
		}

		// Try backup code if TOTP failed
		if ( ! $verified && $this->totp_repo->verify_backup_code( $user_id, $code ) ) {
			$verified = true;
		}

		if ( $verified ) {
			// Delete the pending transient
			delete_transient( self::PENDING_TRANSIENT_PREFIX . $session_id );
			delete_transient( 'bromate_totp_attempts_' . $session_id );

			// Mark session as verified
			update_user_meta( $user_id, self::SESSION_VERIFIED_META_KEY, true );

			// Set trusted cookie if requested
			$remember = isset( $_POST['remember_device'] ) && filter_var( $_POST['remember_device'], FILTER_VALIDATE_BOOLEAN );
			if ( $remember ) {
				$this->set_trusted_cookie( $user_id );
			}

			// Log the user in (in case session was lost)
			if ( ! is_user_logged_in() ) {
				wp_set_current_user( $user_id );
				wp_set_auth_cookie( $user_id, true );
			}

			$redirect_to = isset( $pending['redirect_to'] ) ? $pending['redirect_to'] : admin_url();

			wp_send_json_success( array(
				'message' => 'Verification successful',
				'redirect_url' => $redirect_to,
			) );
		} else {
			// Increment failed attempts
			$attempts = (int) get_transient( 'bromate_totp_attempts_' . $session_id );
			$attempts++;
			set_transient( 'bromate_totp_attempts_' . $session_id, $attempts, self::TRANSIENT_EXPIRY );

			if ( $attempts >= self::MAX_ATTEMPTS ) {
				// Lock out after max attempts
				delete_transient( self::PENDING_TRANSIENT_PREFIX . $session_id );
				wp_send_json_error( array(
					'message' => 'Too many failed attempts. Please try logging in again.',
					'locked' => true,
				), 429 );
				return;
			}

			wp_send_json_error( array(
				'message' => sprintf(
					__( 'Invalid verification code. Attempt %d of %d.', 'bromate-rest-api-firewall' ),
					$attempts,
					self::MAX_ATTEMPTS
				),
				'attempts' => $attempts,
				'max_attempts' => self::MAX_ATTEMPTS,
			), 401 );
		}
	}

	/**
	 * Render the verification form
	 */
	private function render_verification_form( string $username, string $session_id ): void {
		?>
		<!DOCTYPE html>
		<html <?php language_attributes(); ?>>
		<head>
			<meta charset="<?php bloginfo( 'charset' ); ?>">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<title><?php esc_html_e( 'Two-Factor Authentication', 'bromate-rest-api-firewall' ); ?></title>
			<?php wp_head(); ?>
			<style>
				body {
					background: #f0f0f1;
					display: flex;
					justify-content: center;
					align-items: center;
					min-height: 100vh;
					margin: 0;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
				}
				.login-container {
					background: white;
					padding: 40px;
					border-radius: 8px;
					box-shadow: 0 1px 3px rgba(0,0,0,0.13);
					max-width: 400px;
					width: 100%;
					margin: 20px;
				}
				.login-container h1 {
					font-size: 24px;
					margin: 0 0 10px 0;
					font-weight: 400;
				}
				.login-container p {
					color: #646970;
					margin: 0 0 20px 0;
				}
				.login-container .username {
					font-weight: 600;
					color: #1d2327;
				}
				.login-container input[type="text"] {
					width: 100%;
					padding: 12px 16px;
					font-size: 24px;
					text-align: center;
					letter-spacing: 8px;
					border: 1px solid #dcdcde;
					border-radius: 4px;
					box-sizing: border-box;
					margin-bottom: 16px;
					font-family: monospace;
				}
				.login-container input[type="text"]:focus {
					border-color: #2271b1;
					box-shadow: 0 0 0 1px #2271b1;
					outline: none;
				}
				.login-container .remember-device {
					margin: 16px 0;
					display: flex;
					align-items: center;
					gap: 8px;
				}
				.login-container .remember-device input {
					margin: 0;
				}
				.login-container .submit-button {
					background: #2271b1;
					color: white;
					border: none;
					padding: 12px 24px;
					border-radius: 4px;
					font-size: 16px;
					cursor: pointer;
					width: 100%;
					transition: background 0.2s;
				}
				.login-container .submit-button:hover {
					background: #135e96;
				}
				.login-container .submit-button:disabled {
					opacity: 0.6;
					cursor: not-allowed;
				}
				.login-container .error-message {
					background: #fcf0f1;
					border-left: 4px solid #d63638;
					padding: 12px;
					margin-bottom: 16px;
					color: #d63638;
					display: none;
				}
				.login-container .back-link {
					display: block;
					text-align: center;
					margin-top: 16px;
					color: #2271b1;
					text-decoration: none;
				}
				.login-container .back-link:hover {
					color: #135e96;
					text-decoration: underline;
				}
			</style>
		</head>
		<body>
			<div class="login-container">
				<h1><?php esc_html_e( 'Two-Factor Authentication', 'bromate-rest-api-firewall' ); ?></h1>
				<p>
					<?php esc_html_e( 'Enter the verification code from your authenticator app.', 'bromate-rest-api-firewall' ); ?>
					<br>
					<span class="username"><?php echo esc_html( $username ); ?></span>
				</p>

				<div id="error-message" class="error-message"></div>

				<form method="post" id="totp-form">
					<?php wp_nonce_field( 'bromate_totp_login_verify', 'bromate_totp_nonce' ); ?>
					<input type="hidden" name="bromate_totp_session" value="<?php echo esc_attr( $session_id ); ?>">

					<input
						type="text"
						name="bromate_totp_code"
						id="bromate-totp-code"
						placeholder="<?php esc_attr_e( '6-digit code', 'bromate-rest-api-firewall' ); ?>"
						maxlength="6"
						pattern="[0-9]{6}"
						inputmode="numeric"
						autocomplete="one-time-code"
						autofocus
						required
					>

					<div class="remember-device">
						<input type="checkbox" name="bromate_totp_remember" id="remember-device" value="1">
						<label for="remember-device"><?php esc_html_e( 'Remember this device for 30 days', 'bromate-rest-api-firewall' ); ?></label>
					</div>

					<button type="submit" class="submit-button" id="submit-button">
						<?php esc_html_e( 'Verify', 'bromate-rest-api-firewall' ); ?>
					</button>
				</form>

				<a href="<?php echo esc_url( wp_login_url() ); ?>" class="back-link">
					<?php esc_html_e( 'Back to login', 'bromate-rest-api-firewall' ); ?>
				</a>
			</div>

			<script>
			document.addEventListener('DOMContentLoaded', function() {
				const form = document.getElementById('totp-form');
				const codeInput = document.getElementById('bromate-totp-code');
				const submitButton = document.getElementById('submit-button');
				const errorMessage = document.getElementById('error-message');

				// Auto-submit when 6 digits are entered
				codeInput.addEventListener('input', function() {
					this.value = this.value.replace(/\D/g, '').slice(0, 6);
					if (this.value.length === 6) {
						form.submit();
					}
				});

				// Form submission via AJAX
				form.addEventListener('submit', function(e) {
					e.preventDefault();
					
					const code = codeInput.value.trim();
					if (code.length !== 6) {
						errorMessage.textContent = '<?php esc_html_e( 'Please enter a valid 6-digit code.', 'bromate-rest-api-firewall' ); ?>';
						errorMessage.style.display = 'block';
						return;
					}

					submitButton.disabled = true;
					submitButton.textContent = '<?php esc_html_e( 'Verifying...', 'bromate-rest-api-firewall' ); ?>';

					const formData = new FormData();
					formData.append('action', 'bromate_verify_login_totp');
					formData.append('code', code);
					formData.append('session_id', '<?php echo esc_js( $session_id ); ?>');
					formData.append('remember_device', document.getElementById('remember-device').checked ? '1' : '0');
					formData.append('nonce', '<?php echo esc_js( wp_create_nonce( 'bromate_totp_login_verify' ) ); ?>');

					fetch('<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>', {
						method: 'POST',
						body: formData
					})
					.then(response => response.json())
					.then(data => {
						if (data.success) {
							window.location.href = data.data.redirect_url || '<?php echo esc_js( admin_url() ); ?>';
						} else {
							errorMessage.textContent = data.data.message || '<?php esc_html_e( 'Verification failed. Please try again.', 'bromate-rest-api-firewall' ); ?>';
							errorMessage.style.display = 'block';
							submitButton.disabled = false;
							submitButton.textContent = '<?php esc_html_e( 'Verify', 'bromate-rest-api-firewall' ); ?>';
							
							if (data.data.locked) {
								submitButton.disabled = true;
							}
						}
					})
					.catch(() => {
						errorMessage.textContent = '<?php esc_html_e( 'An error occurred. Please try again.', 'bromate-rest-api-firewall' ); ?>';
						errorMessage.style.display = 'block';
						submitButton.disabled = false;
						submitButton.textContent = '<?php esc_html_e( 'Verify', 'bromate-rest-api-firewall' ); ?>';
					});
				});
			});
			</script>

			<?php wp_footer(); ?>
		</body>
		</html>
		<?php
	}

	/**
	 * Check for pending verification on admin pages
	 */
	public function check_pending_verification(): void {
		// Skip if user is not logged in
		if ( ! is_user_logged_in() ) {
			return;
		}

		// Skip if already on verification page
		if ( isset( $_GET['action'] ) && $_GET['action'] === self::VERIFICATION_ACTION ) {
			return;
		}

		$user_id = get_current_user_id();
		
		// Check if TOTP is globally enabled
		if ( ! $this->is_totp_globally_enabled() ) {
			return;
		}

		// Check if user has TOTP enabled
		if ( ! $this->totp_repo->is_totp_enabled( $user_id ) ) {
			return;
		}

		// Check if this is a trusted device (remember me)
		if ( $this->is_trusted_device( $user_id ) ) {
			return;
		}

		// Check if session is already verified
		if ( get_user_meta( $user_id, self::SESSION_VERIFIED_META_KEY, true ) ) {
			return;
		}

		// Check if there's already a pending verification
		$session_id = $this->get_session_id();
		$pending = get_transient( self::PENDING_TRANSIENT_PREFIX . $session_id );
		
		if ( ! $pending || ! isset( $pending['user_id'] ) || (int) $pending['user_id'] !== $user_id ) {
			// Store pending login data
			set_transient(
				self::PENDING_TRANSIENT_PREFIX . $session_id,
				array(
					'user_id'     => $user_id,
					'login_time'  => time(),
					'username'    => wp_get_current_user()->user_login,
					'redirect_to' => admin_url(),
				),
				self::TRANSIENT_EXPIRY
			);
		}

		// Redirect to 2FA verification page
		wp_redirect(
			add_query_arg(
				array(
					'action'  => self::VERIFICATION_ACTION,
					'session' => $session_id,
				),
				wp_login_url()
			)
		);
		exit;
	}

	/**
	 * Clear session verification on logout
	 */
	public function clear_session_verification(): void {
		$user_id = get_current_user_id();
		if ( $user_id ) {
			delete_user_meta( $user_id, self::SESSION_VERIFIED_META_KEY );
		}
		
		// Clear the trusted cookie
		if ( isset( $_COOKIE[ self::TRUSTED_COOKIE_NAME ] ) ) {
			setcookie(
				self::TRUSTED_COOKIE_NAME,
				'',
				time() - 3600,
				COOKIEPATH,
				COOKIE_DOMAIN,
				is_ssl(),
				true
			);
		}
	}

	/**
	 * Check if TOTP is globally enabled
	 */
	private function is_totp_globally_enabled(): bool {
		return (bool) SettingsRepository::read_option( 'login_2fa_enabled' );
	}

	/**
	 * Check if device is trusted
	 */
	private function is_trusted_device( int $user_id ): bool {
		if ( ! isset( $_COOKIE[ self::TRUSTED_COOKIE_NAME ] ) ) {
			return false;
		}

		$cookie = sanitize_text_field( wp_unslash( $_COOKIE[ self::TRUSTED_COOKIE_NAME ] ) );
		$expected = wp_hash( $user_id . ':' . wp_salt() );

		return hash_equals( $expected, $cookie );
	}

	/**
	 * Set trusted device cookie
	 */
	private function set_trusted_cookie( int $user_id ): void {
		$expires = time() + 30 * DAY_IN_SECONDS;
		$value = wp_hash( $user_id . ':' . wp_salt() );

		setcookie(
			self::TRUSTED_COOKIE_NAME,
			$value,
			$expires,
			COOKIEPATH,
			COOKIE_DOMAIN,
			is_ssl(),
			true
		);
	}

	/**
	 * Get or create session ID
	 */
	private function get_session_id(): string {
		if ( session_id() ) {
			return session_id();
		}

		// If no session, create one
		if ( ! headers_sent() ) {
			session_start();
		}

		return session_id() ?: md5( uniqid( 'bromate_totp_', true ) );
	}
}