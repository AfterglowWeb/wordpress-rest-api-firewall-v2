<?php

namespace Bromate\RestApiFirewall\Api\Routing;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Authentication\AuthenticationManager;
use Bromate\RestApiFirewall\Security\RateLimit\RateLimiter;
use Bromate\RestApiFirewall\Security\Ip\IpAccessControl;
use WP_REST_Request;

final class RestRequestBootstrap {

	public static function register(): void {

		add_action(
			'rest_pre_serve_request',
			array( self::class, 'remove_cache_headers' ),
			10,
			1
		);

		add_filter(
			'application_password_is_api_request',
			'__return_true',
			10,
			1
		);

		add_filter(
			'rest_authentication_errors',
			array( self::class, 'authenticate_request' ),
			10,
			100
		);

		add_filter(
			'rest_pre_dispatch',
			array( self::class, 'rate_limit_request' ),
			10,
			1
		);
	}

	public static function remove_cache_headers( $served ) {

		header_remove( 'Cache-Control' );
		header_remove( 'Expires' );
		header_remove( 'Pragma' );

		return $served;
	}

	public static function authenticate_request( $result ) {

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$auth_result = AuthenticationManager::authenticate();

		if ( is_wp_error( $auth_result ) ) {
			return $auth_result;
		}

		return $result;
	}

	public static function rate_limit_request( $result ) {

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$blacklist_result = IpAccessControl::inspect();

		if ( is_wp_error( $blacklist_result ) ) {
			return $blacklist_result;
		}

		$limit_result = RateLimiter::inspect();

		if ( is_wp_error( $limit_result ) ) {
			return $limit_result;
		}

		return $result;
	}
}
