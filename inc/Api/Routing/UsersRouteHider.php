<?php namespace Bromate\RestApiFirewall\Api\Routing;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Server;

class UsersRouteHider {

	protected static ?self $instance = null;

	public static function get_instance(): self {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	private function __construct() {
		add_filter( 'rest_pre_dispatch', array( self::class, 'filter_users_route' ), 5, 3 );
	}


	/**
	 * Filter to block user routes if option is enabled.
	 *
	 * @param mixed           $result  Response to replace the requested version with.
	 * @param WP_REST_Server  $server  Server instance.
	 * @param WP_REST_Request $request Request used to generate the response.
	 * @return mixed|WP_Error
	 */
	public static function filter_users_route( $result, WP_REST_Server $server, WP_REST_Request $request ) {

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! self::is_hidden() ) {
			return $result;
		}

		$route = $request->get_route();

		if ( preg_match( '#^/wp/v2/users(?:/|$)#i', $route ) ) {
			return new WP_Error(
				'rest_forbidden',
				esc_html__( 'User routes are not available.', 'bromate-rest-api-firewall' ),
				array( 'status' => 403 )
			);
		}

		return $result;
	}

	public static function is_hidden(): bool {
		return (bool) SettingsRepository::read_option( 'hide_user_routes' );
	}
}
