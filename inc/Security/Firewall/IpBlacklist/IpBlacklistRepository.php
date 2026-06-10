<?php namespace Bromate\RestApiFirewall\Security\Firewall\IpBlacklist;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Security\Network\IpEntryRepository;
use Bromate\RestApiFirewall\Security\Network\ClientIpResolver;
use WP_Error;

class IpBlacklistRepository {

	protected static $instance = null;

	private const OPTION_KEY                = 'rest_firewall_ip_filter';
	private const AUTO_BLACKLIST_KEY_PREFIX = 'rest_firewall_auto_blacklist_';

	public static function get_instance() {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	public static function default_options(): array {
		return array(
			'enabled'        => false,
			'expiry_seconds' => 0,
		);
	}

	public static function get_options(): array {
		$stored = get_option( self::OPTION_KEY, null );
		return wp_parse_args( $stored, self::default_options() );
	}

	public static function get_option( string $key ) {
		return self::get_options()[ $key ] ?? null;
	}

	public static function update_options( array $new_options ): array {
		$current   = self::get_options();
		$merged    = wp_parse_args( $new_options, $current );
		$sanitized = self::sanitize_options( $merged );
		update_option( self::OPTION_KEY, $sanitized, false );
		return $sanitized;
	}

	public static function sanitize_options( array $options ): array {
		$defaults = self::default_options();

		return array(
			'enabled'        => (bool) ( $options['enabled'] ?? $defaults['enabled'] ),
			'expiry_seconds' => absint( $options['expiry_seconds'] ?? $defaults['expiry_seconds'] ),
		);
	}

	public static function check_request() {
		$client_ip = ClientIpResolver::get_client_ip();

		if ( self::is_auto_blacklisted( $client_ip ) ) {
			return new WP_Error(
				'ip_auto_blacklisted',
				__( 'Your IP address has been temporarily blocked due to excessive requests.', 'bromate-rest-application-layer' ),
				array( 'status' => 403 )
			);
		}

		$options = self::get_options();

		if ( ! $options['enabled'] ) {
			return true;
		}

		if ( IpEntryRepository::ip_in_list( $client_ip, 'blacklist' ) ) {
			return new WP_Error(
				'ip_blacklisted',
				__( 'Your IP address has been blocked.', 'bromate-rest-application-layer' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	public static function ip_blacklist( $result ) {
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$global_check = self::check_request();
		if ( is_wp_error( $global_check ) ) {
			return $global_check;
		}

		if ( false === SettingsRepository::read_option( 'enforce_ip_blacklist' ) ) {
			return $result;
		}

		$ip_check = self::check_request();

		if ( is_wp_error( $ip_check ) ) {
			return $ip_check;
		}

		return $result;
	}

	public static function is_auto_blacklisted( string $ip ): bool {
		return (bool) get_transient( self::AUTO_BLACKLIST_KEY_PREFIX . md5( $ip ) );
	}

	public static function auto_blacklist_ip( string $ip, int $duration ): void {
		set_transient( self::AUTO_BLACKLIST_KEY_PREFIX . md5( $ip ), time(), $duration );
	}

	public static function remove_auto_blacklist( string $ip ): void {
		delete_transient( self::AUTO_BLACKLIST_KEY_PREFIX . md5( $ip ) );
	}
	
}
