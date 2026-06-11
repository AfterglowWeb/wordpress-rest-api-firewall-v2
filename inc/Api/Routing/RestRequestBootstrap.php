<?php

namespace Bromate\RestApiFirewall\Api\Routing;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Authentication\AuthenticationManager;
use Bromate\RestApiFirewall\Security\RateLimit\RateLimiter;
use WP_Error;
use WP_REST_Request;

final class RestRequestBootstrap {

	public static function register(): void {

		add_action(
			'rest_pre_serve_request',
			array( self::class, 'remove_cache_headers' ),
			5
		);

		add_filter(
			'rest_json_encode_options',
			array( self::class, 'json_encode_options' )
		);

		add_filter(
			'application_password_is_api_request',
			'__return_true'
		);

		add_filter(
			'rest_authentication_errors',
			array( self::class, 'authenticate_request' ),
			99
		);

		add_filter(
			'rest_pre_dispatch',
			array( self::class, 'rate_limit_request' ),
			10,
			3
		);
	}

	public static function remove_cache_headers( $served ): mixed {

		header_remove( 'Cache-Control' );
		header_remove( 'Expires' );
		header_remove( 'Pragma' );

		return $served;
	}

	public static function json_encode_options(): int {
		return JSON_UNESCAPED_SLASHES;
	}

	public static function authenticate_request( $result ) {

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$auth_result = AuthenticationManager::is_authenticated();

		if ( is_wp_error( $auth_result ) ) {
			return $auth_result;
		}

		return $result;
	}

	public static function rate_limit_request(
		$result,
		$server,
		WP_REST_Request $request
	) {

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$limit_result = RateLimiter::inspect( $request );

		if ( is_wp_error( $limit_result ) ) {
			return $limit_result;
		}

		return $result;
	}
}