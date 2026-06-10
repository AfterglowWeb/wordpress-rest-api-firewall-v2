<?php
namespace Bromate\RestApiFirewall\Admin;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Core\FileUtils;
use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;
use Bromate\RestApiFirewall\Core\Utils;
use Bromate\RestApiFirewall\Models\ModelsPropertiesRepository;
use Bromate\RestApiFirewall\Webhook\WebhookAutoTrigger;

class AdminPage {

	private function __construct() {}

	public static function register(): void {
		$self = new self();
		add_action(
			'admin_init',
			function () {
				$role_object = get_role( 'administrator' );
				$role_object->add_cap( 'rest_api_firewall_edit_options' );
			}
		);
		add_action( 'admin_menu', array( $self, 'register_admin_page' ) );
		add_action( 'admin_enqueue_scripts', array( $self, 'enqueue_scripts' ) );
		add_action( 'admin_footer', array( $self, 'print_inline_styles' ), 20 );
		add_action( 'wp_ajax_rest_api_firewall_model_properties', array( $self, 'ajax_model_properties' ) );
	}

	public function register_admin_page() {
		add_menu_page(
			__( 'Bromate Application Layer', 'bromate-rest-application-layer' ),
			__( 'Bromate Application Layer', 'bromate-rest-application-layer' ),
			'rest_api_firewall_edit_options',
			'bromate-rest-application-layer',
			array( $this, 'render_admin_page' ),
			'dashicons-tablet',
			99
		);
	}

	public function render_admin_page() {
		echo '<div id="bromate-rest-application-layer-page"></div>';
	}

	public function enqueue_scripts( $hook ) {
		if ( 'toplevel_page_bromate-rest-application-layer' !== $hook ) {
			return;
		}

		$mui_config       = $this->load_script_config( BROMATE_REST_API_FIREWALL_DIR . '/build/mui.asset.php' );
		$mui_dependencies = ! empty( $mui_config ) && isset( $mui_config['dependencies'] ) ? $mui_config['dependencies'] : array();
		wp_enqueue_script(
			'rest-api-firewall-mui',
			BROMATE_REST_API_FIREWALL_URL . '/build/mui.js',
			$mui_dependencies,
			$mui_config['version'],
			true
		);

		$script_config = $this->load_script_config( BROMATE_REST_API_FIREWALL_DIR . '/build/index.asset.php' );
		$dependencies  = ! empty( $script_config ) && isset( $script_config['dependencies'] ) ? $script_config['dependencies'] : array();
		wp_enqueue_script(
			'bromate-rest-application-layer',
			BROMATE_REST_API_FIREWALL_URL . '/build/index.js',
			array_merge(
				$dependencies,
				array( 'rest-api-firewall-mui' )
			),
			$script_config['version'],
			true
		);

		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_data = get_plugin_data( BROMATE_REST_API_FIREWALL_FILE );
		$args        = array(
			'nonce'                              => wp_create_nonce( 'rest_api_firewall_update_options_nonce' ),
			'ajaxurl'                            => admin_url( 'admin-ajax.php' ),
			'users'                              => Utils::list_users(),
			'post_types'                         => Utils::list_rest_api_object_types(),
			'models_properties'                  => array(),
			'admin_options'                      => SettingsRepository::read_options(),
			'options_config'                     => SettingsRepository::options_config_for_js(),
			'plugin_name'                        => sanitize_text_field( $plugin_data['Name'] ),
			'plugin_version'                     => sanitize_text_field( BROMATE_REST_API_FIREWALL_VERSION ),
			'plugin_uri'                         => sanitize_url( $plugin_data['PluginURI'] ),
			'home_url'                           => get_home_url( '/' ),
			'webhook_events'                     => WebhookAutoTrigger::get_available_events(),
			'webhook_event_groups'               => WebhookAutoTrigger::get_event_groups(),
			'date_format'                        => get_option( 'date_format' ),
			'time_format'                        => get_option( 'time_format' ),
			'ip_filter_enabled'                  => (bool) ( get_option( 'rest_firewall_ip_filter', array() )['enabled'] ?? false ),
			'global_ip_filter_enabled'           => (bool) ( get_option( 'rest_firewall_global_ip_filter', array() )['enabled'] ?? false ),
			'pro_plugin_installed'               => file_exists( WP_PLUGIN_DIR . '/rest-api-firewall-pro/rest-api-firewall-pro.php' ),
			'disallow_file_edit'                 => defined( 'DISALLOW_FILE_EDIT' ) && DISALLOW_FILE_EDIT,
			'wp_application_passwords_available' => function_exists( 'wp_is_application_passwords_available' ) && wp_is_application_passwords_available(),
		);

		if ( class_exists( '\Bromate\RestApiFirewall\Theme\RedirectTemplates' ) ) {
			$args['redirect_preset_url_options'] = \Bromate\RestApiFirewall\Theme\RedirectTemplates::redirect_preset_url_options();
		}

		$args = (array) apply_filters( 'rest_api_firewall_admin_localize_data', $args );

		wp_localize_script(
			'bromate-rest-application-layer',
			'restApiFirewallAdminData',
			$args
		);
	}

	public function ajax_model_properties() {
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => __( 'Unauthorized.', 'bromate-rest-application-layer' ) ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- nonce verified above via SettingsAjaxController::ajax_validate_has_firewall_admin_caps()
		$object_type = sanitize_key( wp_unslash( $_POST['object_type'] ?? '' ) );
		if ( empty( $object_type ) ) {
			wp_send_json_error( array( 'message' => 'Missing object_type.' ), 400 );
		}

		wp_send_json_success( array( 'props' => ModelsPropertiesRepository::model_properties_for_type( $object_type ) ) );
	}

	public function print_inline_styles() {
		$hook = get_current_screen();
		if ( 'toplevel_page_bromate-rest-application-layer' !== $hook->id ) {
			return;
		}
		$custom_css = '
		body.toplevel_page_bromate-rest-application-layer #wpcontent {
			padding-left:0;
		}
		body.toplevel_page_bromate-rest-application-layer #wpbody-content {
			padding-bottom:0;
		}
		body.toplevel_page_bromate-rest-application-layer #wpfooter {
			display:none;
		}
		body.toplevel_page_bromate-rest-application-layer #wpbody-content .notice {
			display:none;
		}
		#bromate-rest-application-layer-page input[type=color], 
		#bromate-rest-application-layer-page input[type=date], 
		#bromate-rest-application-layer-page input[type=datetime-local], 
		#bromate-rest-application-layer-page input[type=datetime], 
		#bromate-rest-application-layer-page input[type=email], 
		#bromate-rest-application-layer-page input[type=month], 
		#bromate-rest-application-layer-page input[type=number], 
		#bromate-rest-application-layer-page input[type=password], 
		#bromate-rest-application-layer-page input[type=search], 
		#bromate-rest-application-layer-page input[type=tel], 
		#bromate-rest-application-layer-page input[type=text], 
		#bromate-rest-application-layer-page input[type=time], 
		#bromate-rest-application-layer-page input[type=url], 
		#bromate-rest-application-layer-page input[type=week],
		body.toplevel_page_bromate-rest-application-layer input[type=text],
		body.toplevel_page_bromate-rest-application-layer input[type=password],
		body.toplevel_page_bromate-rest-application-layer input[type=email],
		body.toplevel_page_bromate-rest-application-layer input[type=number],
		body.toplevel_page_bromate-rest-application-layer input[type=tel],
		body.toplevel_page_bromate-rest-application-layer input[type=url] {
			box-shadow: unset;
			border-radius: 4px;
			background-color: none;
			line-height: normal;
			min-height: auto;
			font: inherit;
			letter-spacing: inherit;
			color: currentColor;
			border: 0;
			box-sizing: content-box;
			background: none;
			height: 1.4375em;
			margin: 0;
			-webkit-tap-highlight-color: transparent;
			display: block;
			min-width: 0;
			width: 100%;
			-webkit-animation-name: mui-auto-fill-cancel;
			animation-name: mui-auto-fill-cancel;
			-webkit-animation-duration: 10ms;
			animation-duration: 10ms;
			padding-top: 1px;
			padding: 8.5px 14px;
		}
		#bromate-rest-application-layer-page input[type=checkbox], 
		#bromate-rest-application-layer-page input[type=radio] {
			cursor: inherit;
			position: absolute;
			opacity: 0;
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
			margin: 0;
			padding: 0!important;
			z-index: 1;
			min-width: unset;
			box-shadow: unset;

		}
		#bromate-rest-application-layer-page input[type=checkbox]:disabled,
		body.toplevel_page_bromate-rest-application-layer input[type=checkbox]:disabled {
			opacity:0;
		}
		#bromate-rest-application-layer-page input[type="search"]:focus,
		#bromate-rest-application-layer-page textarea:focus {
			border: unset;
			box-shadow: unset;
		}
		';
		echo '<style type="text/css">' . esc_html( $custom_css ) . '</style>';
	}

	private static function load_script_config( $file_path ): array {
		$config = array();
		if ( FileUtils::is_readable( $file_path ) ) {
			$raw_config             = include realpath( $file_path );
			$config['dependencies'] = isset( $raw_config['dependencies'] ) ? array_map( 'sanitize_key', $raw_config['dependencies'] ) : array();
			$config['version']      = isset( $raw_config['version'] ) ? sanitize_text_field( $raw_config['version'] ) : '1.0.0';
		}
		return $config;
	}
}
