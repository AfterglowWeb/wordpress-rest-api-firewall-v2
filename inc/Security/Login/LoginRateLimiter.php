<?php namespace Bromate\RestApiFirewall\Security\Login;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Security\Network\IpEntryRepository;
use Bromate\RestApiFirewall\Security\Network\CidrMatcher;
use Bromate\RestApiFirewall\Security\Network\ClientIpResolver;

final class LoginRateLimiter {

	public const  BLOCK_PREFIX  = 'rest_firewall_login_blocked_';
	public const  STRIKE_PREFIX = 'rest_firewall_login_strikes_';
	private const COUNT_PREFIX  = 'rest_firewall_login_';

	protected static ?self $instance = null;

	public static function get_instance(): self {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	private function __construct() {
		add_filter( 'authenticate', array( $this, 'check_before_auth' ), 5, 3 );
		add_action( 'wp_login_failed', array( $this, 'on_login_failed' ), 10, 2 );
	}

	public function check_before_auth( $user, string $_username, string $_password ) {
		if ( ! $this->is_enabled() ) {
			return $user;
		}

		$ip = ClientIpResolver::get_client_ip();
		if ( '' === $ip || $this->is_whitelisted( $ip ) ) {
			return $user;
		}

		if ( get_transient( self::BLOCK_PREFIX . self::ip_hash( $ip ) ) ) {
			return new \WP_Error(
				'too_many_login_attempts',
				__( 'Too many failed login attempts. Please try again later.', 'bromate-rest-application-layer' )
			);
		}

		return $user;
	}

	public function on_login_failed( string $_username, $_error = null ): void {
		if ( ! $this->is_enabled() ) {
			return;
		}

		$ip = ClientIpResolver::get_client_ip();
		if ( '' === $ip || $this->is_whitelisted( $ip ) ) {
			return;
		}

		$hash = self::ip_hash( $ip );

		// If check_before_auth already set a block (i.e., this failure was caused
		// by our own WP_Error), do not double-count it.
		if ( get_transient( self::BLOCK_PREFIX . $hash ) ) {
			return;
		}

		$opts      = $this->get_options();
		$count_key = self::COUNT_PREFIX . $hash;
		$count     = (int) get_transient( $count_key );
		++$count;

		if ( $count >= $opts['attempts'] ) {
			// Threshold reached: store the IP as the value (enables block listing in the UI).
			set_transient( self::BLOCK_PREFIX . $hash, $ip, $opts['blacklist_time'] );
			delete_transient( $count_key );

			// Escalation: promote to the shared global IP blacklist after N block cycles.
			if ( $opts['promote_after'] > 0 ) {
				$strike_key = self::STRIKE_PREFIX . $hash;
				$strikes    = (int) get_transient( $strike_key ) + 1;

				if ( $strikes >= $opts['promote_after'] ) {
					$this->promote_to_global_blacklist( $ip, $opts['blacklist_time'] );
					delete_transient( $strike_key );
				} else {
					// Keep strike counter alive across multiple block windows.
					set_transient( $strike_key, $strikes, $opts['blacklist_time'] * ( $opts['promote_after'] + 1 ) );
				}
			}
		} else {
			// Still accumulating — refresh the sliding window.
			set_transient( $count_key, $count, $opts['window'] );
		}
	}

	private function is_enabled(): bool {
		return (bool) SettingsRepository::read_option( 'login_rate_limit_enabled' );
	}

	private function get_options(): array {
		$opts = SettingsRepository::read_options();
		return array(
			'attempts'       => max( 1, (int) ( $opts['login_rate_limit_attempts'] ?? 5 ) ),
			'window'         => max( 1, (int) ( $opts['login_rate_limit_window'] ?? 300 ) ),
			'blacklist_time' => max( 1, (int) ( $opts['login_rate_limit_blacklist_time'] ?? 3600 ) ),
			'promote_after'  => max( 0, (int) ( $opts['login_rate_limit_promote_after'] ?? 0 ) ),
		);
	}

	public static function ip_hash( string $ip ): string {
		return substr( hash( 'sha256', $ip ), 0, 16 );
	}

	private function promote_to_global_blacklist( string $ip, int $duration ): void {
		if ( ! class_exists( IpEntryRepository::class ) ) {
			return;
		}

		if ( IpEntryRepository::ip_in_list( $ip, 'global_blacklist' ) ) {
			return;
		}

		IpEntryRepository::insert(
			array(
				'ip'         => $ip,
				'list_type'  => 'global_blacklist',
				'entry_type' => 'rate_limit',
				'expires_at' => gmdate( 'Y-m-d H:i:s', time() + $duration ),
			)
		);
	}


	private function is_whitelisted( string $ip ): bool {
		$whitelist = array_filter( (array) SettingsRepository::read_option( 'absolute_whitelist' ) );

		foreach ( $whitelist as $entry ) {
			if ( CidrMatcher::ip_matches( $ip, (string) $entry ) ) {
				return true;
			}
		}

		return false;
	}

	public static function get_active_blocks(): array {
		global $wpdb;

		$transient_prefix = '_transient_' . self::BLOCK_PREFIX;
		$timeout_prefix   = '_transient_timeout_' . self::BLOCK_PREFIX;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( $transient_prefix ) . '%'
			),
			ARRAY_A
		);

		if ( ! is_array( $rows ) || empty( $rows ) ) {
			return array();
		}

		$blocks = array();

		foreach ( $rows as $row ) {
			$hash = substr( $row['option_name'], strlen( $transient_prefix ) );
			$ip   = $row['option_value'];

			$timeout   = (int) get_option( $timeout_prefix . $hash, 0 );
			$remaining = $timeout > 0 ? max( 0, $timeout - time() ) : 0;

			$blocks[] = array(
				'ip'        => $ip,
				'remaining' => $remaining,
			);
		}

		// Sort by most time remaining first.
		usort( $blocks, static fn( $a, $b ) => $b['remaining'] <=> $a['remaining'] );

		return $blocks;
	}


}
