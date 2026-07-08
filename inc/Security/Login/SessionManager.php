<?php
namespace Bromate\RestApiFirewall\Security\Login;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;
use WP_Session_Tokens;
use WP_User;

class SessionManager {

	public static function register(): void {
		add_action('wp_login', static function ( $user_login, WP_User $user ) {
			$max = SettingsRepository::read_option('cookie_hardening_max_concurrent_sessions');
			if( empty( $max ) ) {
				return;
			}
			self::enforce_session_limit( $user->ID, $max );
		}, 10, 2);

		add_action( 'wp_ajax_bromate_rest_api_firewall_revoke_all_users', array( self::class, 'ajax_revoke_all_users' ) );
	}

	public static function ajax_revoke_all_users(): void {
		
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		$affected = self::revoke_all_users();

		wp_send_json_success(
			array(
				'message'  => __( 'All sessions and trusted 2FA devices have been revoked.', 'bromate-rest-api-firewall' ),
				'affected' => $affected,
			),
			200
		);
	}

	public static function get_sessions( int $user_id ): array {
		$manager  = WP_Session_Tokens::get_instance( $user_id );
		$sessions = $manager->get_all();

		$out = array();
		foreach ( $sessions as $verifier => $session ) {
			$out[] = array(
				'verifier'   => $verifier,
				'login'      => $session['login'] ?? null,
				'expiration' => $session['expiration'] ?? null,
				'ip'         => $session['ip'] ?? null,
				'ua'         => $session['ua'] ?? null,
				'is_current' => self::is_current_session( $verifier ),
			);
		}

		usort( $out, static fn( $a, $b ) => ( $b['login'] ?? 0 ) <=> ( $a['login'] ?? 0 ) );

		return $out;
	}

	private static function is_current_session( string $verifier ): bool {
		if ( empty( $_COOKIE[ LOGGED_IN_COOKIE ] ) ) {
			return false;
		}
		$parts             = explode( '|', $_COOKIE[ LOGGED_IN_COOKIE ] );
		$current_verifier  = $parts[2] ?? '';
		return hash_equals( $verifier, $current_verifier );
	}

	public static function revoke_session( int $user_id, string $verifier ): void {
		WP_Session_Tokens::get_instance( $user_id )->destroy( $verifier );
	}

	public static function revoke_all_other_sessions( int $user_id ): void {
		WP_Session_Tokens::get_instance( $user_id )->destroy_others( wp_get_session_token() );
	}

	public static function revoke_all_sessions( int $user_id ): void {
		WP_Session_Tokens::get_instance( $user_id )->destroy_all();
		( new TOTPRepository() )->revoke_all_trusted_devices( $user_id );
	}


	public static function revoke_all_users(): int {
		( new TOTPRepository() )->revoke_all_trusted_devices_everywhere();

		$user_ids = get_users( array( 'fields' => 'ID' ) );
		$affected = 0;

		foreach ( $user_ids as $user_id ) {
			$user_id  = (int) $user_id;
			$sessions = WP_Session_Tokens::get_instance( $user_id )->get_all();

			if ( ! empty( $sessions ) ) {
				self::revoke_all_sessions( $user_id );
				++$affected;
			}
		}

		return $affected;
	}

	public static function enforce_session_limit( int $user_id, int $max ): void {
		$manager = WP_Session_Tokens::get_instance( $user_id );

		$sessions = get_user_meta( $user_id, 'session_tokens', true );
		if ( ! is_array( $sessions ) || count( $sessions ) <= $max ) {
			return;
		}

		uasort( $sessions, static fn( $a, $b ) => ( $a['login'] ?? 0 ) <=> ( $b['login'] ?? 0 ) );

		$excess        = count( $sessions ) - $max;
		$current_token = (string) wp_get_session_token();

		foreach ( $sessions as $verifier => $session ) {
			if ( $excess <= 0 ) {
				break;
			}
			if ( hash_equals( (string) $verifier, $current_token ) ) {
				continue;
			}
			$manager->destroy( (string) $verifier );
			--$excess;
		}
	}
}
