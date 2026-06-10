<?php namespace Bromate\RestApiFirewall\Api\Response;

defined( 'ABSPATH' ) || exit;

use WP_REST_Settings_Controller;
use WP_REST_Terms_Controller;
use WP_REST_Users_Controller;
use WP_Post_Type;
use WP_REST_Attachments_Controller;
use WP_REST_Request;

class ModelsPropertiesRepository {

	public static function models_properties(): array {

		$object_types = self::list_rest_api_object_types();
		$result       = array();

		foreach ( $object_types as $object_type ) {
			$result[ $object_type['value'] ] = array(
				'label'    => $object_type['label'],
				'settings' => array(),
				'props'    => self::model_properties( $object_type['value'] ),
			);
		}

		$result['settings_route'] = array(
			'label'    => 'Settings Route',
			'settings' => array(),
			'props'    => self::settings_route_properties(),
		);

		return $result;
	}

	public static function list_rest_api_object_types(): array {
		return array_merge(
			self::list_post_types(),
			self::list_taxonomies(),
			self::format_user_type()
		);
	}

	public static function model_properties_for_type( string $object_type ): array {
		if ( 'settings_route' === $object_type ) {
			return self::settings_route_properties();
		}
		return self::model_properties( $object_type );
	}

	public static function model_properties( string $post_type ): array {

		if ( 'author' === $post_type ) {
			return self::author_properties();
		}

		$filters             = self::properties_filters();
		$string_auto_filters = array_values(
			array_filter( $filters, fn( $f ) => in_array( $f['key'], array( 'search_replace' ), true ) )
		);

		$data = self::get_sample_rest_response_data( $post_type );

		if ( ! empty( $data ) ) {
			$props = self::build_props_from_data( $data, $filters );

			if ( isset( $props['acf'] ) && function_exists( 'acf_get_field_groups' ) ) {
				$all_fields   = array();
				$field_groups = acf_get_field_groups( array( 'post_type' => $post_type ) );
				foreach ( $field_groups as $group ) {
					$fields = isset( $group['key'] ) && acf_get_fields( $group['key'] ) ? acf_get_fields( $group['key'] ) : array();
					foreach ( $fields as $field ) {
						$all_fields[] = $field;
					}
				}
				if ( ! empty( $all_fields ) ) {
					$props['acf']['properties'] = self::build_acf_subprops( $all_fields, $string_auto_filters );
				}
			}

			if ( 'attachment' === $post_type && isset( $props['media_details'] ) && empty( $props['media_details']['properties'] ) ) {
				$props['media_details']['properties'] = self::build_media_details_fallback_props();
			}

			return $props;
		}

		$controller = self::get_rest_controller( $post_type );

		if ( ! $controller || ! method_exists( $controller, 'get_item_schema' ) ) {
			return array();
		}

		$schema = $controller->get_item_schema();

		if ( empty( $schema['properties'] ) ) {
			return array();
		}

		$properties = array();

		foreach ( $schema['properties'] as $property_key => $property ) {
			$property_filters = self::get_filters_per_property( $property_key, $filters );
			$prop_type        = $property['type'] ?? '';
			$is_string        = 'string' === $prop_type || ( is_array( $prop_type ) && in_array( 'string', $prop_type, true ) );
			if ( ! $is_string ) {
				$property_filters = array_values( array_filter( $property_filters, fn( $f ) => 'search_replace' !== $f['key'] ) );
			}
			if ( $is_string ) {
				$existing_keys = array_column( $property_filters, 'key' );
				foreach ( $string_auto_filters as $sf ) {
					if ( ! in_array( $sf['key'], $existing_keys, true ) ) {
						$property_filters[] = $sf;
					}
				}
			}
			// Auto-detect 'rendered' filter from schema: property is an object with a 'rendered' sub-property.
			if ( isset( $property['properties']['rendered'] ) ) {
				self::maybe_add_rendered_filter( $property_filters, $filters );
			}
			$properties[ $property_key ] = array_merge(
				$property,
				array(
					'settings' => array(
						'disable' => false,
						'filters' => $property_filters,
					),
				)
			);
		}

		if ( isset( $properties['acf'] ) && function_exists( 'acf_get_field_groups' ) ) {
			$all_fields   = array();
			$field_groups = acf_get_field_groups( array( 'post_type' => $post_type ) );
			foreach ( $field_groups as $group ) {
				$fields = isset( $group['key'] ) && acf_get_fields( $group['key'] ) ? acf_get_fields( $group['key'] ) : array();
				foreach ( $fields as $field ) {
					$all_fields[] = $field;
				}
			}
			if ( ! empty( $all_fields ) ) {
				$properties['acf']['properties'] = self::build_acf_subprops( $all_fields, $string_auto_filters );
			}
		}

		foreach ( array( '_links', '_embedded' ) as $meta_key ) {
			if ( ! isset( $properties[ $meta_key ] ) ) {
				$properties[ $meta_key ] = array(
					'type'     => 'object',
					'settings' => array(
						'disable' => false,
						'filters' => array(),
					),
				);
			}
		}

		if ( 'attachment' === $post_type && isset( $properties['media_details'] ) && empty( $properties['media_details']['properties'] ) ) {
			$properties['media_details']['properties'] = self::build_media_details_fallback_props();
		}

		return $properties;
	}

	private static function get_attachment_sample_data( string $rest_base ): array {
		// Try image attachments first — they have media_details.sizes populated.
		$candidate_ids = get_posts(
			array(
				'post_type'      => 'attachment',
				'posts_per_page' => 10,
				'fields'         => 'ids',
				'post_status'    => 'inherit',
				'post_mime_type' => 'image',
			)
		);

		if ( empty( $candidate_ids ) ) {
			$candidate_ids = get_posts(
				array(
					'post_type'      => 'attachment',
					'posts_per_page' => 3,
					'fields'         => 'ids',
					'post_status'    => 'inherit',
				)
			);
		}

		if ( empty( $candidate_ids ) ) {
			return array();
		}

		$fallback = array();
		foreach ( $candidate_ids as $attachment_id ) {
			$request = new WP_REST_Request( 'GET', "/wp/v2/{$rest_base}/" . (int) $attachment_id );
			$request->set_param( '_embed', '1' );
			$response = rest_do_request( $request );
			if ( is_wp_error( $response ) || 200 !== $response->get_status() ) {
				continue;
			}
			$raw     = rest_get_server()->response_to_data( $response, true );
			$decoded = json_decode( wp_json_encode( $raw ), true );
			$data    = null !== $decoded ? $decoded : array();
			if ( ! is_array( $data ) ) {
				continue;
			}
			$sizes = isset( $data['media_details']['sizes'] ) ? (array) $data['media_details']['sizes'] : array();
			if ( ! empty( $sizes ) ) {
				return $data; // Best case: has real size variants.
			}
			if ( empty( $fallback ) ) {
				$fallback = $data;
			}
		}

		return $fallback;
	}

	private static function get_sample_rest_response_data( string $object_type ): array {

		$rest_base = '';
		$id        = 0;

		if ( taxonomy_exists( $object_type ) ) {
			$tax_obj   = get_taxonomy( $object_type );
			$rest_base = $tax_obj ?
			( property_exists( $tax_obj, 'rest_base' ) && $tax_obj->rest_base ? $tax_obj->rest_base : $object_type )
			: $object_type;
			$terms     = get_terms(
				array(
					'taxonomy'   => $object_type,
					'number'     => 1,
					'hide_empty' => false,
					'fields'     => 'ids',
				)
			);
			if ( is_wp_error( $terms ) || empty( $terms ) ) {
				return array();
			}
			$id = (int) $terms[0];
		} else {
			$pt_obj = get_post_type_object( $object_type );
			if ( ! $pt_obj ) {
				return array();
			}
			$rest_base = property_exists( $pt_obj, 'rest_base' ) && $pt_obj->rest_base ? $pt_obj->rest_base : $object_type;

			// For attachments, prefer image files which are most likely to have populated media_details.
			if ( 'attachment' === $object_type ) {
				return self::get_attachment_sample_data( $rest_base );
			}

			$posts = get_posts(
				array(
					'post_type'      => $object_type,
					'posts_per_page' => 1,
					'fields'         => 'ids',
					'post_status'    => array( 'publish', 'draft', 'private', 'inherit' ),
				)
			);
			if ( empty( $posts ) ) {
				return array();
			}
			$id = (int) $posts[0];
		}

		$request = new WP_REST_Request( 'GET', "/wp/v2/{$rest_base}/{$id}" );
		$request->set_param( '_embed', '1' );
		$response = rest_do_request( $request );

		if ( is_wp_error( $response ) ) {
			return array();
		}

		if ( 200 !== $response->get_status() ) {
			return array();
		}

		$raw     = rest_get_server()->response_to_data( $response, true );
		$decoded = json_decode( wp_json_encode( $raw ), true );
		return null !== $decoded ? $decoded : array();
	}

	private static function settings_route_properties(): array {
		$filters  = self::properties_filters();
		$request  = new WP_REST_Request( 'GET', '/wp/v2/settings' );
		$response = rest_do_request( $request );

		if ( ! is_wp_error( $response ) && 200 === $response->get_status() ) {
			$data = rest_get_server()->response_to_data( $response, false );
			if ( ! empty( $data ) ) {
				return self::build_props_from_data( $data, $filters );
			}
		}

		$controller          = new WP_REST_Settings_Controller();
		$schema              = $controller->get_item_schema();
		$string_auto_filters = array_values(
			array_filter( $filters, fn( $f ) => in_array( $f['key'], array( 'search_replace' ), true ) )
		);

		if ( empty( $schema['properties'] ) ) {
			return array();
		}

		$properties = array();
		foreach ( $schema['properties'] as $property_key => $property ) {
			$property_filters = array();
			$prop_type        = $property['type'] ?? '';
			$is_string        = 'string' === $prop_type || ( is_array( $prop_type ) && in_array( 'string', $prop_type, true ) );
			if ( $is_string ) {
				foreach ( $string_auto_filters as $sf ) {
					$property_filters[] = $sf;
				}
			}
			$properties[ $property_key ] = array_merge(
				$property,
				array(
					'settings' => array(
						'disable' => false,
						'filters' => $property_filters,
					),
				)
			);
		}

		return $properties;
	}

	public static function fetch_route_properties( string $route ): array {
		$filters  = self::properties_filters();
		$request  = new WP_REST_Request( 'GET', $route );
		$response = rest_do_request( $request );

		if ( ! is_wp_error( $response ) && 200 === $response->get_status() ) {
			$data = rest_get_server()->response_to_data( $response, false );
			if ( ! empty( $data ) && is_array( $data ) ) {
				return self::build_props_from_data( $data, $filters );
			}
		}

		return array();
	}

	public static function build_props_from_data( array $data, array $filters = array(), int $depth = 0 ): array {
		$props = array();

		$string_auto_filters = array_values(
			array_filter(
				$filters,
				function ( $f ) {
					return in_array( $f['key'], array( 'search_replace' ), true );
				}
			)
		);

		foreach ( $data as $key => $value ) {
			$str_key          = (string) $key;
			$type             = self::infer_json_type( $value );
			$property_filters = self::get_filters_per_property( $str_key, $filters );

			if ( 'string' !== $type ) {
				$property_filters = array_values( array_filter( $property_filters, fn( $f ) => 'search_replace' !== $f['key'] ) );
			}

			if ( 'string' === $type && ! empty( $string_auto_filters ) ) {
				$existing_keys = array_column( $property_filters, 'key' );
				foreach ( $string_auto_filters as $sf ) {
					if ( ! in_array( $sf['key'], $existing_keys, true ) ) {
						$property_filters[] = $sf;
					}
				}
			}

			// Auto-detect 'rendered' filter: value is an object with a 'rendered' sub-key.
			// Must happen BEFORE $prop is built so the updated $property_filters snapshot is correct.
			if ( 'object' === $type && is_array( $value ) && array_key_exists( 'rendered', $value ) ) {
				self::maybe_add_rendered_filter( $property_filters, $filters );
			}

			$prop = array(
				'type'     => $type,
				'settings' => array(
					'disable' => false,
					'filters' => $property_filters,
				),
			);

			if ( 'object' === $type && $depth < 5 ) {
				$sub = self::build_props_from_data( (array) $value, $filters, $depth + 1 );
				if ( ! empty( $sub ) ) {
					$prop['properties'] = $sub;
				}
			}

			if ( 'array' === $type && $depth < 5 && is_array( $value ) && ! empty( $value ) ) {
				$first = reset( $value );
				if ( is_array( $first ) && ! empty( $first ) ) {
					$sub = self::build_props_from_data( $first, $filters, $depth + 1 );
					if ( ! empty( $sub ) ) {
						$prop['properties'] = $sub;
					}
				}
			}

			$props[ $str_key ] = $prop;
		}

		return $props;
	}

	private static function infer_json_type( $value ): string {
		if ( is_null( $value ) ) {
			return 'null';
		}
		if ( is_bool( $value ) ) {
			return 'boolean';
		}
		if ( is_int( $value ) ) {
			return 'integer';
		}
		if ( is_float( $value ) ) {
			return 'number';
		}
		if ( is_string( $value ) ) {
			return 'string';
		}
		if ( is_array( $value ) ) {
			foreach ( array_keys( $value ) as $k ) {
				if ( ! is_int( $k ) ) {
					return 'object';
				}
			}
			return 'array';
		}
		return 'object';
	}

	private static function build_acf_subprops( array $fields, array $string_filters = array() ): array {
		$props = array();

		$acf_string_types = array( 'text', 'textarea', 'wysiwyg', 'oembed', 'url', 'email', 'password', 'link' );

		foreach ( $fields as $field ) {
			if ( ! isset( $field['name'], $field['type'] ) ) {
				continue;
			}

			$key      = sanitize_key( $field['name'] );
			$acf_type = $field['type'];

			$field_data = array(
				'type'        => sanitize_text_field( $acf_type ),
				'description' => sanitize_text_field( $field['label'] ?? '' ),
				'settings'    => array(
					'disable' => false,
					'filters' => in_array( $acf_type, $acf_string_types, true ) ? $string_filters : array(),
				),
			);

			if ( ! empty( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
				$field_data['properties'] = self::build_acf_subprops( $field['sub_fields'], $string_filters );
			}

			if ( 'flexible_content' === $acf_type && ! empty( $field['layouts'] ) && is_array( $field['layouts'] ) ) {
				$layout_props = array();
				foreach ( $field['layouts'] as $layout ) {
					$layout_key = sanitize_key( $layout['name'] ?? '' );
					if ( '' === $layout_key ) {
						continue;
					}
					$layout_props[ $layout_key ] = array(
						'type'        => 'object',
						'description' => sanitize_text_field( $layout['label'] ?? '' ),
						'settings'    => array(
							'disable' => false,
							'filters' => array(),
						),
						'properties'  => self::build_acf_subprops( $layout['sub_fields'] ?? array(), $string_filters ),
					);
				}
				$field_data['properties'] = $layout_props;
			}

			$props[ $key ] = $field_data;
		}

		return $props;
	}

	private static function maybe_add_rendered_filter( array &$property_filters, array $filters ): void {
		$existing_keys = array_column( $property_filters, 'key' );
		if ( in_array( 'rendered', $existing_keys, true ) ) {
			return;
		}
		foreach ( $filters as $filter ) {
			if ( 'rendered' === ( $filter['key'] ?? '' ) ) {
				$property_filters[] = $filter;
				return;
			}
		}
	}

	private static function get_filters_per_property( $property_key, $filters ): array {
		$property_filters = array();
		foreach ( $filters as $filter ) {
			if ( in_array( $property_key, $filter['properties'], true ) ) {
				$property_filters[] = $filter;
			}
		}
		return $property_filters;
	}

	private static function get_rest_controller( string $object_type, string $subtype = '' ): ?object {

		$object_type = sanitize_key( $object_type );

		if ( 'site' === $object_type ) {
			return new WP_REST_Settings_Controller();
		}

		if ( 'term' === $object_type ) {
			$taxonomy = ! empty( $subtype ) ? $subtype : 'category';

			if ( taxonomy_exists( $taxonomy ) ) {
				return new WP_REST_Terms_Controller( $taxonomy );
			}

			return null;
		}

		if ( taxonomy_exists( $object_type ) ) {
			return new WP_REST_Terms_Controller( $object_type );
		}

		$post_type_object = get_post_type_object( $object_type );

		if ( ! ( $post_type_object instanceof WP_Post_Type ) || ! $post_type_object->show_in_rest ) {
			return null;
		}

		if ( 'attachment' === $object_type ) {
			return new WP_REST_Attachments_Controller( 'attachment' );
		}

		$controller_class = $post_type_object->rest_controller_class;

		if ( ! class_exists( $controller_class ) ) {
			$controller_class = 'WP_REST_Posts_Controller';
		}

		return new $controller_class( $object_type );
	}

	public static function properties_filters(): array {

		$taxonomy_options = self::list_taxonomies();

		$taxonomy_values = array_map(
			function ( $taxonomy_option ) {
				return $taxonomy_option['value'];
			},
			$taxonomy_options
		);

		$taxonomy_values = array_map(
			function ( $taxonomy ) {
				return 'category' === $taxonomy ? 'categories' : ( 'post_tag' === $taxonomy ? 'tags' : $taxonomy );
			},
			$taxonomy_values
		);

		return array(
			array(
				'key'        => 'embed',
				'tooltip'    => esc_html__( 'Resolve Object', 'bromate-rest-application-layer' ),
				'label'      => esc_html__( 'Resolve Object', 'bromate-rest-application-layer' ),
				'properties' => array_merge(
					array(
						'featured_media',
						'author',
					),
					$taxonomy_values
				),
			),
			array(
				'key'        => 'rendered',
				'tooltip'    => esc_html__( 'Flatten Rendered', 'bromate-rest-application-layer' ),
				'label'      => esc_html__( 'Flatten Rendered', 'bromate-rest-application-layer' ),
				'properties' => array(),
			),
			array(
				'key'        => 'date_format',
				'tooltip'    => esc_html__( 'Date Format', 'bromate-rest-application-layer' ),
				'label'      => esc_html__( 'DateFormat', 'bromate-rest-application-layer' ),
				'properties' => array(
					'date',
					'date_gmt',
					'modified',
					'modified_gmt',
					'registered_date',
				),
			),
			array(
				'key'        => 'relative_url',
				'tooltip'    => esc_html__( 'Relative URL', 'bromate-rest-application-layer' ),
				'label'      => esc_html__( 'Relative URL', 'bromate-rest-application-layer' ),
				'properties' => array(
					'file',
					'link',
					'source_url',
					'guid',
				),
			),
			array(
				'key'        => 'remove_uploads_path',
				'tooltip'    => esc_html__( 'Remove Uploads Path', 'bromate-rest-application-layer' ),
				'label'      => esc_html__( 'Remove Uploads Path', 'bromate-rest-application-layer' ),
				'properties' => array(
					'file',
					'source_url',
					'guid',
					'link',
				),
			),
			array(
				'key'        => 'search_replace',
				'type'       => 'search_replace',
				'tooltip'    => esc_html__( 'Search & Replace', 'bromate-rest-application-layer' ),
				'label'      => esc_html__( 'Search & Replace', 'bromate-rest-application-layer' ),
				'properties' => array(
					'title',
					'content',
					'excerpt',
					'guid',
					'link',
					'source_url',
					'description',
					'name',
					'slug',
				),
			),
		);
	}
	
	private static function author_properties(): array {

		$filters             = self::properties_filters();
		$string_auto_filters = array_values(
			array_filter( $filters, fn( $f ) => in_array( $f['key'], array( 'search_replace' ), true ) )
		);

		$users = get_users(
			array(
				'number' => 1,
				'fields' => 'ids',
			)
		);
		if ( ! empty( $users ) ) {
			$id       = (int) $users[0];
			$request  = new WP_REST_Request( 'GET', "/wp/v2/users/{$id}" );
			$response = rest_do_request( $request );
			if ( ! is_wp_error( $response ) && 200 === $response->get_status() ) {
				$data = rest_get_server()->response_to_data( $response, false );
				if ( ! empty( $data ) ) {
					return self::apply_author_security_flags(
						self::build_props_from_data( $data, $filters )
					);
				}
			}
		}

		$controller = new WP_REST_Users_Controller();
		$schema     = $controller->get_item_schema();

		if ( empty( $schema['properties'] ) ) {
			return array();
		}

		$props = array();
		foreach ( $schema['properties'] as $key => $property ) {
			$property_filters = self::get_filters_per_property( $key, $filters );
			$prop_type        = $property['type'] ?? '';
			$is_string        = 'string' === $prop_type || ( is_array( $prop_type ) && in_array( 'string', $prop_type, true ) );
			if ( ! $is_string ) {
				$property_filters = array_values( array_filter( $property_filters, fn( $f ) => 'search_replace' !== $f['key'] ) );
			}
			if ( $is_string ) {
				$existing_keys = array_column( $property_filters, 'key' );
				foreach ( $string_auto_filters as $sf ) {
					if ( ! in_array( $sf['key'], $existing_keys, true ) ) {
						$property_filters[] = $sf;
					}
				}
			}
			// Auto-detect 'rendered' filter from schema: property is an object with a 'rendered' sub-property.
			if ( isset( $property['properties']['rendered'] ) ) {
				self::maybe_add_rendered_filter( $property_filters, $filters );
			}
			$props[ $key ] = array_merge(
				$property,
				array(
					'settings' => array(
						'disable' => false,
						'filters' => $property_filters,
					),
				)
			);
		}

		foreach ( array( '_links', '_embedded' ) as $meta_key ) {
			if ( ! isset( $props[ $meta_key ] ) ) {
				$props[ $meta_key ] = array(
					'type'     => 'object',
					'settings' => array(
						'disable' => false,
						'filters' => array(),
					),
				);
			}
		}

		return self::apply_author_security_flags( $props );
	}

	private static function apply_author_security_flags( array $props ): array {

		$locked = array( 'username', 'email', 'capabilities', 'extra_capabilities' );
		foreach ( $locked as $key ) {
			if ( isset( $props[ $key ] ) ) {
				$props[ $key ]['settings']['disable'] = true;
				$props[ $key ]['settings']['locked']  = true;
				$props[ $key ]['settings']['filters'] = array();
			}
		}

		$disabled_default = array( 'registered_date', 'roles', 'locale' );
		foreach ( $disabled_default as $key ) {
			if ( isset( $props[ $key ] ) ) {
				$props[ $key ]['settings']['disable'] = true;
			}
		}

		return $props;
	}

	private static function build_media_details_fallback_props(): array {
		$empty_settings = array(
			'disable' => false,
			'filters' => array(),
		);
		$string_prop    = array(
			'type'     => 'string',
			'settings' => $empty_settings,
		);
		$integer_prop   = array(
			'type'     => 'integer',
			'settings' => $empty_settings,
		);

		$size_properties = array(
			'file'       => $string_prop,
			'width'      => $integer_prop,
			'height'     => $integer_prop,
			'mime_type'  => $string_prop,
			'source_url' => $string_prop,
		);

		$sizes_props = array();
		if ( function_exists( 'wp_get_registered_image_subsizes' ) ) {
			foreach ( array_keys( wp_get_registered_image_subsizes() ) as $size_name ) {
				$sizes_props[ $size_name ] = array(
					'type'       => 'object',
					'settings'   => $empty_settings,
					'properties' => $size_properties,
				);
			}
		}

		return array(
			'width'      => $integer_prop,
			'height'     => $integer_prop,
			'file'       => $string_prop,
			'filesize'   => $integer_prop,
			'sizes'      => array(
				'type'       => 'object',
				'settings'   => $empty_settings,
				'properties' => $sizes_props,
			),
			'image_meta' => array(
				'type'     => 'object',
				'settings' => $empty_settings,
			),
		);
	}

	public static function list_users(): array {
		$users = get_users(
			array(
				'role__in' => array( 'administrator' ),
				'number'   => 500,
				'orderby'  => 'display_name',
				'order'    => 'ASC',
			)
		);

		if ( empty( $users ) ) {
			return array();
		}

		return array_map(
			static function ( \WP_User $user ): array {
				$user_id = (int) $user->ID;
				return array(
					'value'        => $user_id,
					'label'        => sanitize_text_field( $user->display_name ?? '' ),
					'admin_url'    => sanitize_url( get_edit_user_link( $user_id ) ),
					'current_user' => get_current_user_id() === $user_id ? 1 : 0,
				);
			},
			array_filter(
				(array) $users,
				static fn ( $user ) => $user instanceof \WP_User
			)
		);
	}

	public static function format_user_type(): array {
		$user_counts = count_users();
		return array(
			array(
				'value'    => 'author',
				'label'    => __( 'Author', 'bromate-rest-application-layer' ),
				'public'   => true,
				'_builtin' => false,
				'type'     => 'author',
				'source'   => 'WordPress',
				'count'    => (int) ( $user_counts['total_users'] ?? 0 ),
			),
		);
	}


	public static function list_post_types(): array {

		$post_types = get_post_types(
			array(
				'show_in_rest' => true,
			),
			'objects'
		);

		if ( empty( $post_types ) ) {
			return array();
		}

		$list = array_map(
			static function ( object $post_type ): array {
				if ( function_exists( 'icl_object_id' ) ) {
					// WPML is active: count only posts in the current admin language.
					$q     = new \WP_Query(
						array(
							'post_type'      => $post_type->name,
							'post_status'    => array( 'publish', 'inherit' ),
							'posts_per_page' => 1,
							'no_found_rows'  => false,
							'fields'         => 'ids',
						)
					);
					$count = (int) $q->found_posts;
				} else {
					$counts = wp_count_posts( $post_type->name );
					$count  = (int) ( ( $counts->publish ?? 0 ) + ( $counts->inherit ?? 0 ) );
				}
				return array(
					'value'     => sanitize_key( $post_type->name ),
					'label'     => property_exists( $post_type->labels, 'singular_name' )
						? sanitize_text_field( $post_type->labels->singular_name )
						: sanitize_key( $post_type->name ),
					'public'    => $post_type->public || $post_type->publicly_queryable,
					'_builtin'  => $post_type->_builtin,
					'type'      => 'post_type',
					'rest_base' => sanitize_key( property_exists( $post_type, 'rest_base' ) ? $post_type->rest_base : $post_type->name ),
					'count'     => $count,
				);
			},
			$post_types
		);

		return array_values( $list );
	}

	public static function list_taxonomies(): array {
		$taxonomies = get_taxonomies(
			array(
				'show_in_rest' => true,
			),
			'objects'
		);

		if ( empty( $taxonomies ) ) {
			return array();
		}

		$list = array_map(
			static function ( object $taxonomy ): array {
				if ( function_exists( 'icl_object_id' ) ) {
					// WPML is active: count terms in the current admin language only.
					$current_lang = apply_filters( 'wpml_current_language', null );
					$count_args   = array(
						'taxonomy'   => $taxonomy->name,
						'hide_empty' => false,
					);
					if ( $current_lang ) {
						$count_args['lang'] = $current_lang;
					}
					$count = wp_count_terms( $count_args );
				} else {
					$count = wp_count_terms(
						array(
							'taxonomy'   => $taxonomy->name,
							'hide_empty' => false,
						)
					);
				}
				return array(
					'value'    => sanitize_key( $taxonomy->name ),
					'label'    => property_exists( $taxonomy->labels, 'singular_name' )
						? sanitize_text_field( $taxonomy->labels->singular_name )
						: sanitize_key( $taxonomy->name ),
					'public'   => $taxonomy->public,
					'_builtin' => $taxonomy->_builtin,
					'type'     => 'taxonomy',
					'count'    => is_wp_error( $count ) ? 0 : (int) $count,
				);
			},
			$taxonomies
		);

		return array_values( $list );
	}
}
