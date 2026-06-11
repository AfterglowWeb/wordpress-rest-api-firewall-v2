<?php namespace Bromate\RestApiFirewall\Security\Authentication;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Security\Authentication\ApplicationPasswordAuthenticator;
use Bromate\RestApiFirewall\Security\Authentication\JwtAuthenticator;

class AuthenticationManager {

	public static function is_authenticated() {

		$options = SettingsRepository::read_options();
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
