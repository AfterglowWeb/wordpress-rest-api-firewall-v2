<?php namespace Bromate\RestApiFirewall\Security\Ip;

use Bromate\RestApiFirewall\Security\Ip\ClientIpResolver;
use Bromate\RestApiFirewall\Security\RateLimit\AutoBlacklist;
use Bromate\RestApiFirewall\Logs\FirewallLogger;
use WP_Error;

class IpAccessControl {

	public static function inspect() {

		$ip = ClientIpResolver::get_client_ip();

		if ( IpEntryRepository::ip_in_list( $ip, 'whitelist' ) ) {
			FirewallLogger::log( $ip, 'ip_whitelisted_bypass' );
			return true;
		}

		if ( GeoIpApi::is_country_blocked( $ip ) ) {
			FirewallLogger::ip_blocked( $ip, 'blacklist' );
			return new WP_Error(
				'rest_firewall_country_blocked',
				__( 'Access from your country is not allowed.', 'bromate-rest-api-firewall' ),
				array( 'status' => 403 )
			);
		}

		if ( IpEntryRepository::ip_in_list( $ip, 'blacklist' ) ) {
			FirewallLogger::ip_blocked( $ip, 'blacklist' );

			return new WP_Error(
				'rest_firewall_ip_in_blacklist',
				__( 'Your IP address is blocked.', 'bromate-rest-api-firewall' ),
				array( 'status' => 403 )
			);
		}

		if ( AutoBlacklist::is_auto_blacklisted( $ip ) ) {
			FirewallLogger::ip_blocked( $ip, 'blacklist' );

			return new WP_Error(
				'rest_firewall_ip_blacklisted',
				__( 'Your IP has been temporarily blocked.', 'bromate-rest-api-firewall' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}
}
