<?php namespace Bromate\RestApiFirewall\Security\RateLimit;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Ip\ClientIpResolver;
use Bromate\RestApiFirewall\Security\Ip\IpEntryRepository;
use WP_Error;

class AutoBlacklist {

	private const AUTO_BLACKLIST_KEY_PREFIX = 'rest_firewall_auto_blacklist_';

	public static function check_request() {
		$client_ip = ClientIpResolver::get_client_ip();

		if ( self::is_auto_blacklisted( $client_ip ) ) {
			return new WP_Error(
				'ip_auto_blacklisted',
				__( 'Your IP address has been temporarily blocked due to excessive requests.', 'bromate-rest-api-firewall' ),
				array( 'status' => 403 )
			);
		}

		if ( IpEntryRepository::ip_in_list( $client_ip, 'blacklist' ) ) {
			return new WP_Error(
				'ip_blacklisted',
				__( 'Your IP address has been blocked.', 'bromate-rest-api-firewall' ),
				array( 'status' => 403 )
			);
		}

		return true;
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
