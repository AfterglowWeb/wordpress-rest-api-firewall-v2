<?php namespace Bromate\RestApiFirewall\Security\Authentication;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Authentication\ApplicationPasswordAuthenticator;
use Bromate\RestApiFirewall\Security\Authentication\JwtAuthenticator;

class AuthContext {

	protected static ?self $instance = null;

	public static function get_instance(): self {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	public function is_authenticated() {

		$method = $options['firewall_auth_method'] ?? 'wp_auth';

		if ( 'jwt' === $method ) {
			return JwtAuthenticator::validate_bearer_jwt(
				array(
					'algorithm'  => $options['firewall_jwt_algorithm'] ?? 'RS256',
					'public_key' => $options['firewall_jwt_public_key'] ?? '',
					'audience'   => $options['firewall_jwt_audience'] ?? '',
					'issuer'     => $options['firewall_jwt_issuer'] ?? '',
				)
			);
		}

		return ApplicationPasswordAuthenticator::validate_wp_application_password();
	}


}
