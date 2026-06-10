<?php namespace Bromate\RestApiFirewall\Api\Routing;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;

class RoutesPolicyRepository {

	protected static $instance = null;

	public static function get_instance() {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	public static function is_pro_active(): bool {
		return (bool) apply_filters( 'rest_api_firewall_pro_active', false );
	}

	private function __construct() {
		add_action( 'wp_ajax_get_routes_policy_tree', array( $this, 'ajax_get_routes_policy_tree' ) );
		add_action( 'wp_ajax_save_routes_policy_tree', array( $this, 'ajax_save_routes_policy_tree' ) );
	}

	public static function get_routes_policy_tree(): array {
		$flat   = self::list_all_rest_routes();
		$tree   = self::build_policy_tree( $flat );
		$diff   = self::get_diff();
		$result = self::apply_diff( $tree, $diff );
		return $result;
	}

	public function ajax_get_routes_policy_tree(): void {
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		$routes_tree = self::get_routes_policy_tree();
		$diff        = self::get_diff();
		wp_send_json_success(
			array(
				'tree'       => $routes_tree,
				'pro_active' => self::is_pro_active(),
				'users'      => $diff['users'] ?? array(),
			),
			200
		);
	}

	public function ajax_save_routes_policy_tree(): void {
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in SettingsAjaxController::ajax_validate_has_firewall_admin_caps()
		if ( ! isset( $_POST['tree'] ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Bad request error', 'bromate-rest-application-layer' ),
				),
				400
			);
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in SettingsAjaxController::ajax_validate_has_firewall_admin_caps()
		$tree = json_decode( sanitize_text_field( wp_unslash( $_POST['tree'] ) ), true );

		if ( ! is_array( $tree ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Bad request error', 'bromate-rest-application-layer' ),
				),
				400
			);
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in SettingsAjaxController::ajax_validate_has_firewall_admin_caps()
		$users_raw = isset( $_POST['users'] ) ? sanitize_text_field( wp_unslash( $_POST['users'] ) ) : '[]';
		$users     = json_decode( $users_raw, true );
		if ( ! is_array( $users ) ) {
			$users = array();
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified above.
		$application_id = isset( $_POST['application_id'] ) ? sanitize_text_field( wp_unslash( $_POST['application_id'] ) ) : '';

		$diff                   = self::extract_diff_from_tree( $tree );
		$diff['users']          = self::normalize_users( $users );
		$diff['application_id'] = $application_id;
		$saved                  = self::save_diff( $diff );

		if ( ! $saved ) {
			wp_send_json_error(
				array(
					'message' => __( 'Failed to save policy', 'bromate-rest-application-layer' ),
				),
				500
			);
		}

		wp_send_json_success(
			array(
				'message' => __( 'Policy saved successfully', 'bromate-rest-application-layer' ),
			),
			200
		);
	}

	public static function save_diff( array $diff ): bool {
		$diff = array(
			'nodes'  => $diff['nodes'] ?? array(),
			'routes' => $diff['routes'] ?? array(),
			'users'  => $diff['users'] ?? array(),
		);

		/**
		 * Filter to handle policy saving.
		 * Pro plugin hooks here to save to its own storage.
		 *
		 * @param bool  $saved Whether the policy was saved.
		 * @param array $diff  The policy diff to save.
		 * @return bool True if saved successfully.
		 */
		$saved = apply_filters( 'rest_api_firewall_save_policy', false, $diff );

		if ( ! $saved ) {
			SettingsRepository::update_option( 'policy', $diff );
			return true;
		}

		return $saved;
	}

	public static function get_diff(): array {
		$default = array(
			'nodes'  => array(),
			'routes' => array(),
			'users'  => array(),
		);

		/**
		 * Filter to provide policy data.
		 * Pro plugin hooks here to provide its policy.
		 *
		 * @param array $default Default empty policy.
		 * @return array Policy with 'nodes' and 'routes' keys.
		 */
		$policy = apply_filters( 'rest_api_firewall_get_policy', $default );

		if ( $policy === $default ) {
			$saved = SettingsRepository::read_option( 'policy' );
			return is_array( $saved ) ? $saved : $default;
		}

		return $policy;
	}

	private static function apply_diff( array $tree, array $diff ): array {

		foreach ( $tree as &$namespace ) {
			self::apply_node_diff( $namespace, $diff );
		}

		return $tree;
	}

	private static function apply_node_diff( array &$node, array $diff ): void {

		$is_method   = isset( $node['isMethod'] ) && $node['isMethod'];
		$storage_key = $is_method ? 'routes' : 'nodes';

		if ( isset( $node['id'], $diff[ $storage_key ][ $node['id'] ] ) ) {

			if ( ! isset( $node['settings'] ) ) {
				$node['settings'] = array();
			}

			$saved_settings = $diff[ $storage_key ][ $node['id'] ];

			foreach ( $saved_settings as $key => $value ) {
				$node['settings'][ $key ] = $value;
			}
		}

		if ( ! empty( $node['children'] ) ) {
			foreach ( $node['children'] as &$child ) {
				self::apply_node_diff( $child, $diff );
			}
		}
	}

	private static function extract_diff_from_tree( array $tree ): array {
		$diff = array(
			'nodes'  => array(),
			'routes' => array(),
		);

		foreach ( $tree as $node ) {
			self::extract_node_diff( $node, $diff );
		}

		return $diff;
	}

	private static function extract_node_diff( array $node, array &$diff ): void {

		if ( isset( $node['id'], $node['settings'] ) ) {
			$settings = array();

			if ( isset( $node['settings']['protect'] ) ) {
				$protect = $node['settings']['protect'];
				if ( is_array( $protect ) && isset( $protect['value'] ) ) {
					if ( ! ( $protect['inherited'] ?? false ) ) {
						$settings['protect'] = (bool) $protect['value'];
						if ( $protect['overridden'] ?? false ) {
							$settings['protect_overridden'] = true;
						}
					}
				}
			}

			if ( isset( $node['settings']['disabled'] ) ) {
				$disabled = $node['settings']['disabled'];
				if ( is_array( $disabled ) && isset( $disabled['value'] ) ) {
					if ( ! ( $disabled['inherited'] ?? false ) ) {
						$settings['disabled'] = (bool) $disabled['value'];
						if ( $disabled['overridden'] ?? false ) {
							$settings['disabled_overridden'] = true;
						}
					}
				}
			}

			if ( isset( $node['settings']['rate_limit'] ) ) {
				$rate_limit = $node['settings']['rate_limit'];
				if ( is_array( $rate_limit ) && isset( $rate_limit['value'] ) ) {
					if ( ! ( $rate_limit['inherited'] ?? false ) ) {
						$settings['rate_limit'] = (bool) $rate_limit['value'];
						if ( $rate_limit['overridden'] ?? false ) {
							$settings['rate_limit_overridden'] = true;
						}
					}
				}
			}

			$is_method = isset( $node['isMethod'] ) && $node['isMethod'];

			if ( ! empty( $node['settings']['custom'] ) ) {
				$settings['custom'] = true;
			}

			if ( ! empty( $node['settings']['locked'] ) ) {
				$settings['locked'] = true;
			}

			if ( ! empty( $settings ) ) {
				if ( $is_method ) {
					$diff['routes'][ $node['id'] ] = $settings;
				} else {
					$diff['nodes'][ $node['id'] ] = $settings;
				}
			}
		}

		if ( ! empty( $node['children'] ) && is_array( $node['children'] ) ) {
			foreach ( $node['children'] as $child ) {
				self::extract_node_diff( $child, $diff );
			}
		}
	}

	private static function normalize_users( array $users ): array {
		$out = array();
		foreach ( $users as $user ) {
			if ( empty( $user['id'] ) ) {
				continue;
			}
			$out[] = array(
				'id'                  => sanitize_text_field( $user['id'] ),
				'wp_user_id'          => isset( $user['wp_user_id'] ) ? (int) $user['wp_user_id'] : 0,
				'display_name'        => isset( $user['display_name'] ) ? sanitize_text_field( $user['display_name'] ) : '',
				'related_routes_uuid' => isset( $user['related_routes_uuid'] ) && is_array( $user['related_routes_uuid'] )
					? array_values( array_map( 'sanitize_text_field', $user['related_routes_uuid'] ) )
					: array(),
			);
		}
		return $out;
	}

	public static function build_policy_tree( array $flat_routes ): array {

		$tree = array();

		foreach ( $flat_routes as $route ) {

			$parsed = self::route_to_segments( $route['route'] );

			if ( empty( $parsed ) ) {
				continue;
			}

			$namespace = $parsed['namespace'];
			$segments  = $parsed['segments'];

			if ( ! isset( $tree[ $namespace ] ) ) {
				$tree[ $namespace ] = array(
					'id'       => self::node_id( '/' . $namespace ),
					'label'    => $namespace,
					'path'     => '/' . $namespace,
					'children' => array(),
					'routes'   => array(),
				);
			}

			if ( empty( $segments ) ) {
				$already_exists = false;
				foreach ( $tree[ $namespace ]['routes'] as $existing ) {
					if ( $existing['method'] === $route['method'] && $existing['route'] === $route['route'] ) {
						$already_exists = true;
						break;
					}
				}
				if ( ! $already_exists ) {
					$tree[ $namespace ]['routes'][] = self::build_route_entry( $route );
				}
				continue;
			}

			self::insert_route(
				$tree[ $namespace ]['children'],
				$segments,
				$route,
				'/' . $namespace
			);

		}

		return self::normalize_tree( $tree );
	}

	private static function normalize_tree( array $tree ): array {
		$out = array();

		foreach ( $tree as $node ) {
			if ( ! isset( $node['id'] ) || ! $node['id'] ) {
				$node['id'] = self::node_id( $node['path'] ?? uniqid() );
			}

			$all_children = array();

			if ( ! empty( $node['routes'] ) ) {
				foreach ( $node['routes'] as $route ) {
					$all_children[] = array(
						'id'         => $route['uuid'],
						'label'      => $route['method'],
						'path'       => $node['path'],
						'method'     => $route['method'],
						'route'      => $route['route'],
						'params'     => $route['params'],
						'isMethod'   => true,
						'callback'   => $route['callback'],
						'permission' => $route['permission'],
						'settings'   => $route['settings'],
						'children'   => array(),
					);
				}
				unset( $node['routes'] );
			}

			if ( ! empty( $node['children'] ) ) {
				$all_children = array_merge(
					$all_children,
					self::normalize_tree( $node['children'] )
				);
			}

			if ( ! empty( $all_children ) ) {
				$node['children'] = $all_children;
			} else {
				unset( $node['children'] );
			}

			if ( empty( $node['meta'] ) ) {
				unset( $node['meta'] );
			}

			$out[] = $node;
		}

		return $out;
	}

	private static function node_id( string $path ): string {
		return md5( $path );
	}

	/** Route Model */
	private static function route_to_segments( string $route ): array {

		$route = trim( $route, '/' );
		if ( '' === $route ) {
			return array();
		}

		$segments = array();
		$buffer   = '';
		$depth    = 0;
		$length   = strlen( $route );

		for ( $i = 0; $i < $length; $i++ ) {
			$char = $route[ $i ];

			if ( '(' === $char ) {
				++$depth;
			} elseif ( ')' === $char ) {
				--$depth;
			}

			if ( '/' === $char && 0 === $depth ) {
				$segments[] = $buffer;
				$buffer     = '';
				continue;
			}

			$buffer .= $char;
		}

		if ( '' !== $buffer ) {
			$segments[] = $buffer;
		}

		if ( count( $segments ) < 2 ) {
			return array();
		}

		$namespace = $segments[0] . '/' . $segments[1];
		$segments  = array_slice( $segments, 2 );

		$segments = array_map(
			static function ( $segment ) {

				if ( preg_match( '#^\(\?P<([^>]+)>#', $segment, $m ) ) {
					return '{' . $m[1] . '}';
				}

				return $segment;
			},
			$segments
		);

		return array(
			'namespace' => $namespace,
			'segments'  => $segments,
		);
	}

	private static function insert_route( array &$tree, array $segments, array $route, string $base_path = '' ): void {

		$current =& $tree;
		$path    = $base_path;

		foreach ( $segments as $index => $segment ) {

			$path .= '/' . $segment;

			if ( ! isset( $current[ $segment ] ) ) {
				$current[ $segment ] = array(
					'id'       => self::node_id( $path ),
					'label'    => $segment,
					'path'     => $path,
					'children' => array(),
					'routes'   => array(),
				);
			}

			$current_node =& $current[ $segment ];

			if ( count( $segments ) - 1 === $index ) {

				$existing_index = null;
				foreach ( $current_node['routes'] as $i => $r ) {
					if ( $r['method'] === $route['method'] && $r['route'] === $route['route'] ) {
						$existing_index = $i;
						break;
					}
				}

				if ( null !== $existing_index ) {
					$current_node['routes'][ $existing_index ]['settings'] = array_merge(
						$current_node['routes'][ $existing_index ]['settings'] ?? array(),
						array(
							'protect'         => false,
							'rate_limit'      => false,
							'rate_limit_time' => false,
							'disabled'        => false,
							'tags'            => array(),
						)
					);
				} else {
					$current_node['routes'][] = self::build_route_entry( $route );
				}
			}

			$current =& $current_node['children'];
		}
	}

	private static function build_route_entry( array $route ): array {

		return array(
			'uuid'       => self::route_uuid( $route ),
			'method'     => $route['method'],
			'route'      => $route['route'],
			'params'     => $route['params'],
			'settings'   => array(
				'protect'         => false,
				'rate_limit'      => false,
				'rate_limit_time' => false,
				'disabled'        => false,
				'tags'            => array(),
			),
			'callback'   => $route['callback'],
			'permission' => array(
				'type'     => $route['permission_type'],
				'callback' => $route['permission_callback'],
			),
		);
	}

	private static function route_uuid( array $route ): string {
		return md5( $route['route'] . '|' . $route['method'] );
	}




	public static function list_all_rest_routes(): array {

		$cached = get_transient( 'rest_firewall_routes_list' );
		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}

		$server = rest_get_server();
		$routes = $server->get_routes();

		$output = array();

		foreach ( $routes as $route => $endpoints ) {

			foreach ( $endpoints as $endpoint ) {

				$methods = array_keys( $endpoint['methods'] ?? array() );
				if ( empty( $methods ) ) {
					continue;
				}

				foreach ( $methods as $method ) {

					$permission_cb = $endpoint['permission_callback'] ?? null;
					$route_params  = self::extract_route_params( $route );

					$output[] = array(
						'route'               => $route,
						'params'              => $route_params,
						'method'              => $method,
						'callback'            => self::normalize_callable(
							$endpoint['callback'] ?? null
						),
						'permission_callback' => self::normalize_callable(
							$permission_cb
						),
						'permission_type'     => self::describe_permission_callback(
							$permission_cb
						),
						'show_in_index'       => (bool) ( $endpoint['show_in_index'] ?? false ),
						'namespace'           => explode( '/', trim( $route, '/' ) )[0] ?? '',
					);

				}
			}
		}

		set_transient( 'rest_firewall_routes_list', $output, HOUR_IN_SECONDS );

		return $output;
	}

	public static function flush_routes_cache(): void {
		delete_transient( 'rest_firewall_routes_list' );
	}

	private static function normalize_callable( $callback_name ) {

		if ( is_string( $callback_name ) ) {
			return $callback_name;
		}

		if ( is_array( $callback_name ) && isset( $callback_name[0], $callback_name[1] ) ) {
			if ( is_object( $callback_name[0] ) ) {
				return get_class( $callback_name[0] ) . '::' . $callback_name[1];
			}

			if ( is_string( $callback_name[0] ) ) {
				return $callback_name[0] . '::' . $callback_name[1];
			}
		}

		if ( $callback_name instanceof \Closure ) {
			return 'closure';
		}

		return null;
	}

	private static function describe_permission_callback( $cb ): string {

		if ( empty( $cb ) ) {
			return 'public';
		}

		if ( '__return_true' === $cb ) {
			return 'public';
		}

		if ( '__return_false' === $cb ) {
			return 'forbidden';
		}

		if ( $cb instanceof \Closure ) {
			return 'custom';
		}

		if ( is_array( $cb ) ) {
			return 'protected';
		}

		return 'custom';
	}

	private static function extract_route_params( string $route ): array {

		preg_match_all(
			'#\(\?P<([^>]+)>([^)]+)\)#',
			$route,
			$matches,
			PREG_SET_ORDER
		);

		$params = array();

		foreach ( $matches as $match ) {
			$params[] = array(
				'name'  => $match[1],
				'regex' => $match[2],
			);
		}

		return $params;
	}
}
