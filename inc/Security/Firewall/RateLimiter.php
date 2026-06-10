<?php namespace Bromate\RestApiFirewall\Security\Firewall;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Security\Network\ClientIpResolver;
use Bromate\RestApiFirewall\Security\Firewall\IpBlacklist\IpBlacklistRepository;

use WP_REST_Request;
use WP_Error;

class RateLimiter {

	private const VIOLATION_KEY_PREFIX = 'rest_firewall_rl_violations_';
	private const BLOCKED_KEY_PREFIX   = 'rest_firewall_rl_blocked_';

	public static function is_blocked( string $client_id ): bool {
		$key = self::BLOCKED_KEY_PREFIX . md5( $client_id );
		return (bool) get_transient( $key );
	}

	public static function block_client( string $client_id, int $release_time ): void {
		$key = self::BLOCKED_KEY_PREFIX . md5( $client_id );
		set_transient( $key, time(), $release_time );
	}

	public static function record_violation( string $client_id, int $blacklist_time ): int {
		$key   = self::VIOLATION_KEY_PREFIX . md5( $client_id );
		$count = (int) get_transient( $key );
		++$count;
		set_transient( $key, $count, $blacklist_time );
		return $count;
	}

	public static function get_violation_count( string $client_id ): int {
		$key = self::VIOLATION_KEY_PREFIX . md5( $client_id );
		return (int) get_transient( $key );
	}


	public static function clear_violations( string $client_id ): void {
		$key = self::VIOLATION_KEY_PREFIX . md5( $client_id );
		delete_transient( $key );
	}

	/**
	 * Check rate limit for a request.
	 *
	 * @param \WP_REST_Request $request    The REST request.
	 * @param int|false        $rate_limit Optional rate limit (requests). Falls back to global.
	 * @param int|false        $time_limit Optional time window (seconds). Falls back to global.
	 * @return true|\WP_Error
	 */
	public static function rate_limit( WP_REST_Request $request, $rate_limit = false, $time_limit = false ) {

		$firewall_options = SettingsRepository::read_options();

		if ( empty( $firewall_options['rate_limit_enabled'] ) ) {
			return true;
		}

		$client_id = ClientIdentifier::resolve( $request );
		$client_ip = ClientIpResolver::get_client_ip();

		if ( IpBlacklistRepository::is_auto_blacklisted( $client_ip ) ) {
			return new WP_Error(
				'rest_firewall_ip_blacklisted',
				esc_html__( 'Your IP has been temporarily blocked due to repeated violations.', 'bromate-rest-application-layer' ),
				array( 'status' => 403 )
			);
		}

		$firewall_options = SettingsRepository::read_options();
		$user             = wp_get_current_user();

		if ( $user instanceof \WP_User && $user->exists() ) {
			$key                 = 'rest_firewall_rl_' . md5( $client_id . $request->get_route() );
			$rate_limit          = false !== $rate_limit ? (int) $rate_limit : (int) $firewall_options['rate_limit'];
			$time_limit          = false !== $time_limit ? (int) $time_limit : (int) $firewall_options['rate_limit_time'];
			$release_time        = (int) $firewall_options['rate_limit_release'];
			$blacklist_threshold = (int) $firewall_options['rate_limit_blacklist'];
			$blacklist_time      = (int) $firewall_options['rate_limit_blacklist_time'];

		} else {
			

			$key                 = 'rest_firewall_pub_rl_' . md5( $client_ip . $request->get_route() );
			$rate_limit          = (int) ( $firewall_options['public_rate_limit'] ?? 100 );
			$time_limit          = (int) ( $firewall_options['public_rate_limit_time'] ?? 60 );
			$release_time        = (int) ( $firewall_options['public_rate_limit_release'] ?? 300 );
			$blacklist_threshold = (int) ( $firewall_options['public_rate_limit_blacklist'] ?? 10 );
			$blacklist_time      = (int) ( $firewall_options['public_rate_limit_blacklist_time'] ?? 3600 );
		}

		if ( self::is_blocked( $client_id ) ) {
			return new WP_Error(
				'rest_firewall_rate_limited',
				esc_html__( 'Too many requests. Please wait before trying again.', 'bromate-rest-application-layer' ),
				array( 'status' => 429 )
			);
		}

		$count = (int) get_transient( $key );

		if ( $count >= $rate_limit ) {
			$violations = self::record_violation( $client_id, $blacklist_time );

			if ( $blacklist_threshold > 0 && $violations >= $blacklist_threshold ) {
				IpBlacklistRepository::auto_blacklist_ip( $client_ip, $blacklist_time );
				self::clear_violations( $client_id );

				return new WP_Error(
					'rest_firewall_ip_blacklisted',
					esc_html__( 'Your IP has been temporarily blocked due to repeated violations.', 'bromate-rest-application-layer' ),
					array( 'status' => 403 )
				);
			}

			self::block_client( $client_id, $release_time );

			return new WP_Error(
				'rest_firewall_rate_limited',
				esc_html__( 'Too many requests. Please wait before trying again.', 'bromate-rest-application-layer' ),
				array( 'status' => 429 )
			);
		}

		set_transient( $key, $count + 1, $time_limit );

		return true;
	}

}
