<?php namespace Bromate\RestApiFirewall\Security\Ip;

use Bromate\RestApiFirewall\Security\Ip\ClientIpResolver;
use Bromate\RestApiFirewall\Security\RateLimit\AutoBlacklist;
use WP_Error;

class IpAccessControl {

    public static function inspect() {

        $ip = ClientIpResolver::get_client_ip();

        if ( AutoBlacklist::is_auto_blacklisted( $ip ) ) {
            return new WP_Error(
                'rest_firewall_ip_blacklisted',
                __( 'Your IP has been temporarily blocked.', 'bromate-rest-api-firewall' ),
                array( 'status' => 403 )
            );
        }

        if ( IpEntryRepository::ip_in_list( $ip, 'blacklist' ) ) {
            return new WP_Error(
                'rest_firewall_ip_in_blacklist',
                __( 'Too many requests. Your IP is blocked.', 'bromate-rest-api-firewall' ),
                array( 'status' => 429 )
            );
        }

        return true;
    }
}