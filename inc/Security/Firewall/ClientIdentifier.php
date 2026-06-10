<?php namespace Bromate\RestApiFirewall\Security\Firewall;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Network\ClientIpResolver;
use WP_REST_Request;

class ClientIdentifier {

	public static function resolve( WP_REST_Request $request ): string {
		$user = wp_get_current_user();

		if ( $user && $user->exists() ) {
			return 'user_' . $user->ID;
		}

		$ip         = ClientIpResolver::get_client_ip();
		$user_agent = $request->get_header( 'user-agent' ) ?? '';
		$auth       = $request->get_header( 'authorization' ) ?? '';

		return 'anon_' . md5( $ip . $user_agent . $auth );
	}

}
