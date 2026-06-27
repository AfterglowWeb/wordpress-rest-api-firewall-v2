<?php namespace Bromate\RestApiFirewall\Core\Settings;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Api\Routing\RoutesPolicyRepository;
use Bromate\RestApiFirewall\Api\Response\ModelsPropertiesRepository;

class SettingsAjaxController {

	private function __construct() {}

	public static function register(): void {
		$self = new self();

		add_action( 'wp_ajax_bromate_rest_api_firewall_read_options', array( $self, 'ajax_read_options' ) );
		add_action( 'wp_ajax_bromate_rest_api_firewall_update_options', array( $self, 'ajax_update_options' ) );
		add_action( 'wp_ajax_bromate_rest_api_firewall_update_option', array( $self, 'ajax_update_option' ) );
		add_action( 'wp_ajax_bromate_rest_api_firewall_flush_rewrite_rules', array( $self, 'ajax_flush_rewrite_rules' ) );
		add_action( 'wp_ajax_bromate_get_routes_policy_tree', array( $self, 'ajax_get_routes_policy_tree' ) );
		add_action( 'wp_ajax_bromate_save_routes_policy_tree', array( $self, 'ajax_save_routes_policy_tree' ) );
		add_action( 'wp_ajax_bromate_authorized_users_options', array( $self, 'ajax_authorized_users_options' ) );
		add_action( 'wp_ajax_bromate_get_wordpress_objects', array( $self, 'ajax_get_wordpress_objects' ) );
	}

	public function ajax_read_options() {
		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		$options = SettingsRepository::read_options();
		wp_send_json_success( $options );
	}

	public function ajax_update_options() {

		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized', 'bromate-rest-api-firewall' ) ), 403 );
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in self::ajax_validate_has_firewall_admin_caps()
		if ( isset( $_POST['options'] ) ) {

			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in self::ajax_validate_has_firewall_admin_caps()
			$options = json_decode( sanitize_text_field( wp_unslash( $_POST['options'] ) ), true );
			if ( ! is_array( $options ) ) {
				wp_send_json_error( array( 'error' => esc_html__( 'Invalid options data', 'bromate-rest-api-firewall' ) ), 400 );
			}

			$options = SettingsRepository::update_options( $options );

			wp_send_json_success(
				array(
					'message' => esc_html__( 'Options saved', 'bromate-rest-api-firewall' ),
					'options' => $options,
				)
			);
		} else {
			$options = SettingsRepository::read_options();
			wp_send_json_success( $options );
		}
	}

	public function ajax_update_option() {

		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in self::ajax_validate_has_firewall_admin_caps()
		if ( isset( $_POST['option'] ) ) {

			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in self::ajax_validate_has_firewall_admin_caps()
			$option = json_decode( sanitize_text_field( wp_unslash( $_POST['option'] ) ), true );
			if ( ! is_array( $option ) ) {
				wp_send_json_error( array( 'error' => esc_html__( 'Invalid option data', 'bromate-rest-api-firewall' ) ), 422 );
			}

			$key   = isset( $option['key'] ) && ! empty( $option['key'] ) ? $option['key'] : '';
			$value = array_key_exists( 'value', $option ) ? $option['value'] : null;

			if ( $key === '' || $value === null ) {
				wp_send_json_error( array( 'error' => esc_html__( 'Invalid option data', 'bromate-rest-api-firewall' ) ), 422 );
			}

			$option = SettingsRepository::update_option( $key, $value );

			wp_send_json_success(
				array(
					'message' => esc_html__( 'Option saved', 'bromate-rest-api-firewall' ),
					'option'  => $option,
				)
			);
		} else {
			wp_send_json_error( 'Unknown parameter', 422 );
		}
	}

	public function ajax_get_routes_policy_tree(): void {
		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		$routes_tree = RoutesPolicyRepository::get_routes_policy_tree();
		wp_send_json_success(
			array(
				'tree' => $routes_tree,
			),
			200
		);
	}

	public function ajax_authorized_users_options(): void {
		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized', 'bromate-rest-api-firewall' ) ), 403 );
		}
		$wordpress_users = SettingsRepository::authorized_users_options();
		wp_send_json_success( $wordpress_users );
	}

	public function ajax_get_wordpress_objects(): void {
		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized', 'bromate-rest-api-firewall' ) ), 403 );
		}
		$wordpress_objects = ModelsPropertiesRepository::list_rest_api_object_types();
		wp_send_json_success( $wordpress_objects );
	}

	public function ajax_save_routes_policy_tree(): void {
		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in SettingsAjaxController::ajax_validate_has_firewall_admin_caps()
		if ( ! isset( $_POST['tree'] ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Bad request error', 'bromate-rest-api-firewall' ),
				),
				400
			);
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified in SettingsAjaxController::ajax_validate_has_firewall_admin_caps()
		$tree = json_decode( sanitize_text_field( wp_unslash( $_POST['tree'] ) ), true );

		if ( ! is_array( $tree ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Bad request error', 'bromate-rest-api-firewall' ),
				),
				400
			);
		}

		$saved = RoutesPolicyRepository::save_routes_policy_tree( $tree );

		if ( ! $saved ) {
			wp_send_json_error(
				array(
					'message' => __( 'Failed to save policy', 'bromate-rest-api-firewall' ),
				),
				500
			);
		}

		wp_send_json_success(
			array(
				'message' => __( 'Policy saved successfully', 'bromate-rest-api-firewall' ),
			),
			200
		);
	}

	public static function ajax_validate_has_firewall_admin_caps(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified below via wp_verify_nonce
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';

		$valid = wp_verify_nonce( $nonce, 'bromate_rest_api_firewall_update_options_nonce' );

		return (bool) $valid
			&& is_user_logged_in()
			&& current_user_can( 'bromate_rest_api_firewall_edit_options' );
	}

	public function ajax_flush_rewrite_rules(): void {
		if ( false === self::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized', 'bromate-rest-api-firewall' ) ), 403 );
		}

		flush_rewrite_rules( false );
		wp_send_json_success( array( 'message' => esc_html__( 'Rewrite rules flushed successfully.', 'bromate-rest-api-firewall' ) ) );
	}

}
