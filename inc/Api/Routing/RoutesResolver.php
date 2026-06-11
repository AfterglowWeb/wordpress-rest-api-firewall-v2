<?php namespace Bromate\RestApiFirewall\Api\Routing;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use WP_REST_Request;

class RoutesResolver {

	protected static $cache = array();

	public static function clear_cache(): void {
		self::$cache = array();
	}

	public static function resolve_for_request( WP_REST_Request $request ): array {

		$route  = $request->get_route();
		$method = $request->get_method();

		$cache_key = $method . ':' . $route;

		if ( isset( self::$cache[ $cache_key ] ) ) {
			return self::$cache[ $cache_key ];
		}

		$policy = self::resolve_for_route( $route, $method );

		self::$cache[ $cache_key ] = $policy;

		return $policy;
	}

	protected static function resolve_for_route( string $route, string $method ): array {

		$tree = RoutesPolicyRepository::get_routes_policy_tree();

		$node_chain = self::find_node_chain( $tree, $route );

		$node_settings = array();

		foreach ( $node_chain as $node ) {
			if ( ! empty( $node['settings'] ) ) {
				$node_settings[] = $node['settings'];
			}
		}

		$route_settings = self::find_route_settings(
			$node_chain,
			$route,
			$method
		);

		$effective = self::resolve_settings(
			$node_settings,
			$route_settings,
			self::is_wordpress_core_route( $route )
		);

		// Apply global disable flags (mirrors frontend NodeContent logic).
		// Only applies when the route has no custom per-route settings override.
		if ( $effective['state'] ) {
			$is_custom = false;
			foreach ( $node_settings as $ns ) {
				if ( ! empty( $ns['custom'] ) ) {
					$is_custom = true;
					break;
				}
			}
			if ( ! $is_custom && ! empty( $route_settings['custom'] ) ) {
				$is_custom = true;
			}

			if ( ! $is_custom ) {
				$opts        = SettingsRepository::read_options();
				$opts        = apply_filters( 'bromate_rest_api_firewall_runtime_options', $opts );
				$dis_methods = isset( $opts['disabled_methods'] ) ? (array) $opts['disabled_methods'] : array();

				if (
					( ! empty( $opts['hide_oembed_routes'] ) && 0 === strpos( $route, '/oembed' ) ) ||
					( ! empty( $opts['hide_user_routes'] ) && 0 === strpos( $route, '/wp/v2/users' ) ) ||
					( ! empty( $opts['hide_batch_routes'] ) && ( 0 === strpos( $route, '/wp/v2/batch' ) || 0 === strpos( $route, '/batch/v1' ) ) ) ||
					( ! empty( $dis_methods ) && in_array( strtolower( $method ), $dis_methods, true ) )
				) {
					$effective['state'] = false;
				}
			}
		}

		return $effective;
	}

	protected static function find_node_chain( array $tree, string $route ): array {

		$segments = explode( '/', trim( $route, '/' ) );

		$namespace = $segments[0] . '/' . $segments[1];
		$path      = '/' . $namespace;

		$chain = array();

		foreach ( $tree as $node ) {
			if ( $node['path'] === $path ) {
				$chain[] = $node;
				self::walk_chain(
					$node,
					array_slice( $segments, 2 ),
					$chain
				);
				break;
			}
		}

		return $chain;
	}

	protected static function walk_chain( array $node, array $segments, array &$chain ): void {

		if ( empty( $segments ) || empty( $node['children'] ) ) {
			return;
		}

		$next = array_shift( $segments );

		foreach ( $node['children'] as $child ) {
			if ( $child['label'] === $next ) {
				$chain[] = $child;
				self::walk_chain( $child, $segments, $chain );
				return;
			}
		}
	}

	protected static function find_route_settings( array $node_chain, string $route, string $method ): array {

		$uuid = md5( $route . '|' . $method );

		$leaf = end( $node_chain );

		if ( empty( $leaf['routes'] ) ) {
			return array();
		}

		foreach ( $leaf['routes'] as $route_entry ) {
			if ( $route_entry['uuid'] === $uuid ) {
				return $route_entry['settings'] ?? array();
			}
		}

		return array();
	}

	protected static function resolve_settings( array $node_settings_chain, array $route_settings, bool $is_core_route = true ): array {

		$firewall_options = SettingsRepository::read_options();

		/**
		 * Allow per-application settings to override the global firewall options
		 * used during policy resolution (e.g. enforce_auth, enforce_rate_limit).
		 * The pro plugin hooks here to inject the current application's settings.
		 *
		 * @param array $firewall_options Merged global + per-app options.
		 */
		$firewall_options = apply_filters( 'bromate_rest_api_firewall_runtime_options', $firewall_options );

		$global_enforce_auth    = (bool) ( $firewall_options['enforce_auth'] ?? false );
		$global_enforce_rate    = (bool) ( $firewall_options['enforce_rate_limit'] ?? false );
		$global_rate_limit      = (int) ( $firewall_options['rate_limit'] ?? 30 );
		$global_rate_limit_time = (int) ( $firewall_options['rate_limit_time'] ?? 60 );

		$resolved = array(
			'disabled'        => false,
			'protect'         => $global_enforce_auth && self::has_configured_users(),
			'rate_limit'      => $global_enforce_rate ? $global_rate_limit : false,
			'rate_limit_time' => $global_enforce_rate ? $global_rate_limit_time : false,
			'tags'            => array(),
		);

		foreach ( $node_settings_chain as $settings ) {
			$resolved = self::merge_settings( $resolved, $settings );
		}

		$final = self::merge_settings( $resolved, $route_settings );

		if ( $global_enforce_auth && $is_core_route && self::has_configured_users() ) {
			$final['protect'] = true;
		}

		if ( $global_enforce_rate ) {
			$final['rate_limit']      = $global_rate_limit;
			$final['rate_limit_time'] = $global_rate_limit_time;
		}

		return array(
			'state'           => ! $final['disabled'],
			'protect'         => $final['protect'],
			'rate_limit'      => $final['rate_limit'],
			'rate_limit_time' => $final['rate_limit_time'],
			'tags'            => $final['tags'] ?? array(),
		);
	}

	/**
	 * Returns true when $route belongs to the WordPress core REST API namespaces
	 * (wp, oembed, batch, wp-site-health, wp-abilities, wp-block-editor). Non-core routes (e.g. WooCommerce /wc/v3,
	 * plugin routes) are excluded from global auth enforcement.
	 */
	public static function is_wordpress_core_route( string $route ): bool {
		$segments  = explode( '/', ltrim( $route, '/' ) );
		$namespace = $segments[0] ?? '';
		return in_array( $namespace, array( 'wp', 'oembed', 'batch', 'wp-site-health', 'wp-abilities', 'wp-block-editor' ), true );
	}

	/**
	 * Returns true if at least one API user is configured for this site/application.
	 *
	 * In free tier: checks the global `firewall_user_id` CoreOption.
	 * In pro tier: the pro plugin hooks `rest_api_firewall_has_configured_users` to
	 * perform a per-application user count instead.
	 *
	 * When no users are configured, auth enforcement is silently skipped so that a
	 * deliberately public application is never locked out by a global `enforce_auth`
	 * flag that was set before any users were added.
	 *
	 * @return bool
	 */
	public static function has_configured_users(): bool {
		$has = (int) SettingsRepository::read_option( 'firewall_user_id' ) > 0;

		/**
		 * Override the user-existence check.
		 * The pro plugin uses this filter to switch to a per-application query.
		 *
		 * @param bool $has Whether at least one user is configured (free-tier default).
		 */
		return (bool) apply_filters( 'bromate_rest_api_firewall_has_configured_users', $has );
	}

	private static function merge_settings( array $base, array $override ): array {

		foreach ( $override as $key => $value ) {

			if ( null === $value ) {
				continue;
			}

			if ( is_array( $value ) && isset( $value['value'] ) ) {
				if ( ! ( $value['inherited'] ?? false ) || isset( $base[ $key ] ) === false ) {
					$base[ $key ] = $value['value'];
				}
			} elseif ( is_array( $value ) && 'tags' === $key ) {
				$base[ $key ] = array_values(
					array_unique(
						array_merge( $base[ $key ] ?? array(), $value )
					)
				);
			} else {
				$base[ $key ] = $value;
			}
		}

		return $base;
	}
}
