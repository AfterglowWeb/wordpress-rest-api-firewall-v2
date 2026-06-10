<?php namespace Bromate\RestApiFirewall\Api\Response;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use WP_REST_Response;

class ResponseTransformer {

	public static function register() {

		self::set_posts_per_page();
		self::set_collection_order();
	}

	private static function set_posts_per_page(): void {

		$per_page_settings = SettingsRepository::read_option( 'rest_collection_per_page_settings' );

		if ( empty( $per_page_settings ) || ! is_array( $per_page_settings ) ) {
			return;
		}

		foreach ( get_post_types(
			array(
				'show_in_rest' => true,
				'public'       => true,
			)
		) as $post_type ) {
			if ( empty( $per_page_settings[ $post_type ]['enabled'] ) ) {
				continue;
			}

			$items_per_page = (int) ( $per_page_settings[ $post_type ]['items_per_page'] ?? 25 );
			if ( $items_per_page < 1 ) {
				continue;
			}

			add_filter(
				'rest_' . $post_type . '_collection_params',
				static function ( $query_params ) use ( $items_per_page ) {
					if ( isset( $query_params['per_page'] ) ) {
						$query_params['per_page']['default'] = $items_per_page;
						$query_params['per_page']['maximum'] = $items_per_page;
					}
					return $query_params;
				},
				10,
				1
			);
		}

		foreach ( get_taxonomies(
			array(
				'show_in_rest' => true,
				'public'       => true,
			)
		) as $taxonomy ) {
			if ( empty( $per_page_settings[ $taxonomy ]['enabled'] ) ) {
				continue;
			}

			$items_per_page = (int) ( $per_page_settings[ $taxonomy ]['items_per_page'] ?? 25 );
			if ( $items_per_page < 1 ) {
				continue;
			}

			add_filter(
				'rest_' . $taxonomy . '_collection_params',
				static function ( $query_params ) use ( $items_per_page ) {
					if ( isset( $query_params['per_page'] ) ) {
						$query_params['per_page']['default'] = $items_per_page;
						$query_params['per_page']['maximum'] = $items_per_page;
					}
					return $query_params;
				},
				10,
				1
			);
		}
	}

	private static function set_collection_order(): void {

		$per_page_settings = SettingsRepository::read_option( 'rest_collection_per_page_settings' );
		$collection_orders = SettingsRepository::read_option( 'rest_collection_orders' );

		if ( ( empty( $per_page_settings ) || ! is_array( $per_page_settings ) ) &&
			( empty( $collection_orders ) || ! is_array( $collection_orders ) ) ) {
			return;
		}

		$per_page_settings = is_array( $per_page_settings ) ? $per_page_settings : array();
		$collection_orders = is_array( $collection_orders ) ? $collection_orders : array();

		foreach ( get_post_types(
			array(
				'show_in_rest' => true,
				'public'       => true,
			)
		) as $post_type ) {
			$order         = (array) ( $collection_orders[ $post_type ] ?? array() );
			$enforce_order = ! empty( $per_page_settings[ $post_type ]['enforce_order'] );

			if ( empty( $order ) && ! $enforce_order ) {
				continue;
			}

			add_filter(
				'rest_' . $post_type . '_query',
				static function ( $args ) use ( $order, $enforce_order ) {
					if ( ! empty( $order ) && $enforce_order ) {
						$args['post__in']            = $order;
						$args['orderby']             = 'post__in';
						$args['ignore_sticky_posts'] = true;
					} elseif ( $enforce_order ) {
						$args['orderby'] = 'menu_order';
						$args['order']   = 'ASC';
					}
					return $args;
				},
				10,
				1
			);
		}

		foreach ( get_taxonomies(
			array(
				'show_in_rest' => true,
				'public'       => true,
			)
		) as $taxonomy ) {
			$order         = (array) ( $collection_orders[ $taxonomy ] ?? array() );
			$enforce_order = ! empty( $per_page_settings[ $taxonomy ]['enforce_order'] );

			if ( empty( $order ) && ! $enforce_order ) {
				continue;
			}

			add_filter(
				'rest_' . $taxonomy . '_query',
				static function ( $args ) use ( $order, $enforce_order ) {
					if ( ! empty( $order ) && $enforce_order ) {
						$args['include'] = $order;
						$args['orderby'] = 'include';
					} elseif ( $enforce_order ) {
						$args['orderby'] = 'name';
						$args['order']   = 'ASC';
					}
					return $args;
				},
				10,
				1
			);
		}
	}

	private static function deactivate_cache( WP_REST_Response $response ): WP_REST_Response {
		$response->header( 'Cache-Control', 'no-cache, must-revalidate, max-age=0' );
		$response->header( 'Expires', gmdate( 'D, d M Y H:i:s', time() - 1800 ) . ' GMT' );
		$response->header( 'Pragma', 'no-cache' );
		return $response;
	}
}
