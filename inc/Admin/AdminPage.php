<?php
namespace Bromate\RestApiFirewall\Admin;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Utils\FileUtils;

class AdminPage {

	private function __construct() {}

	public static function register(): void {
		$self = new self();
		add_action(
			'admin_init',
			function () {
				$role_object = get_role( 'administrator' );
				$role_object->add_cap( 'bromate_rest_api_firewall_edit_options' );
			}
		);
		add_action( 'admin_menu', array( $self, 'register_admin_page' ) );
		add_action( 'admin_enqueue_scripts', array( $self, 'enqueue_scripts', 10, 1 ) );
		add_action( 'admin_footer', array( $self, 'print_inline_styles' ), 20 );
		add_action( 'admin_notices', array( $self, 'admin_notices' ) );
	}

	public function register_admin_page() {
		add_menu_page(
			__( 'Bromate REST API Firewall', 'bromate-rest-api-firewall' ),
			__( 'Bromate REST API Firewall', 'bromate-rest-api-firewall' ),
			'bromate_rest_api_firewall_edit_options',
			'bromate-rest-api-firewall',
			array( $this, 'render_admin_page' ),
			'dashicons-tablet',
			99
		);
	}

	public function render_admin_page() {
		echo '<div id="bromate-rest-api-firewall-page"></div>';
	}

	public function enqueue_scripts( $hook ) {
		if ( 'toplevel_page_bromate-rest-api-firewall' !== $hook ) {
			return;
		}

		$mui_config       = $this->load_script_config( BROMATE_REST_API_FIREWALL_DIR . '/build/mui.asset.php' );
		$mui_dependencies = ! empty( $mui_config ) && isset( $mui_config['dependencies'] ) ? $mui_config['dependencies'] : array();
		wp_enqueue_script(
			'bromate-rest-api-firewall-mui',
			BROMATE_REST_API_FIREWALL_URL . '/build/mui.js',
			$mui_dependencies,
			$mui_config['version'],
			true
		);

		$script_config = $this->load_script_config( BROMATE_REST_API_FIREWALL_DIR . '/build/index.asset.php' );
		$dependencies  = ! empty( $script_config ) && isset( $script_config['dependencies'] ) ? $script_config['dependencies'] : array();
		wp_enqueue_script(
			'bromate-rest-api-firewall',
			BROMATE_REST_API_FIREWALL_URL . '/build/index.js',
			array_merge(
				$dependencies,
				array( 'bromate-rest-api-firewall-mui' )
			),
			$script_config['version'],
			true
		);

		wp_localize_script(
			'bromate-rest-api-firewall',
			'BromateRestApiFirewall',
			array(
				'nonce'   => wp_create_nonce( 'bromate_rest_api_firewall_update_options_nonce' ),
				'ajaxurl' => admin_url( 'admin-ajax.php' ),
				'plugin' => array(
					'name'    => 'Bromate REST API Firewall',
					'version' => BROMATE_REST_API_FIREWALL_VERSION,
				),
			)
		);
	}

	public function print_inline_styles() {
		$hook = get_current_screen();
		if ( 'toplevel_page_bromate-rest-api-firewall' !== $hook->id ) {
			return;
		}
		$custom_css = '
		body.toplevel_page_bromate-rest-api-firewall #wpcontent {
			padding-left:0;
		}
		body.toplevel_page_bromate-rest-api-firewall #wpbody-content {
			padding-bottom:0;
		}
		body.toplevel_page_bromate-rest-api-firewall #wpfooter {
			display:none;
		}
		body.toplevel_page_bromate-rest-api-firewall #wpbody-content .notice {
			display:none;
		}
		#bromate-rest-api-firewall-page input[type=color], 
		#bromate-rest-api-firewall-page input[type=date], 
		#bromate-rest-api-firewall-page input[type=datetime-local], 
		#bromate-rest-api-firewall-page input[type=datetime], 
		#bromate-rest-api-firewall-page input[type=email], 
		#bromate-rest-api-firewall-page input[type=month], 
		#bromate-rest-api-firewall-page input[type=number], 
		#bromate-rest-api-firewall-page input[type=password], 
		#bromate-rest-api-firewall-page input[type=search], 
		#bromate-rest-api-firewall-page input[type=tel], 
		#bromate-rest-api-firewall-page input[type=text], 
		#bromate-rest-api-firewall-page input[type=time], 
		#bromate-rest-api-firewall-page input[type=url], 
		#bromate-rest-api-firewall-page input[type=week],
		body.toplevel_page_bromate-rest-api-firewall input[type=text],
		body.toplevel_page_bromate-rest-api-firewall input[type=password],
		body.toplevel_page_bromate-rest-api-firewall input[type=email],
		body.toplevel_page_bromate-rest-api-firewall input[type=number],
		body.toplevel_page_bromate-rest-api-firewall input[type=tel],
		body.toplevel_page_bromate-rest-api-firewall input[type=url] {
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
		#bromate-rest-api-firewall-page input[type=checkbox], 
		#bromate-rest-api-firewall-page input[type=radio] {
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
		#bromate-rest-api-firewall-page input[type=checkbox]:disabled,
		body.toplevel_page_bromate-rest-api-firewall input[type=checkbox]:disabled {
			opacity:0;
		}
		#bromate-rest-api-firewall-page input[type="search"]:focus,
		#bromate-rest-api-firewall-page textarea:focus {
			border: unset;
			box-shadow: unset;
		}
		';
		echo '<style type="text/css">' . esc_html( $custom_css ) . '</style>';
	}

	public function admin_notices(): void {
		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_data = get_plugin_data( BROMATE_REST_API_FIREWALL_FILE );

		if ( ! is_array( $plugin_data ) ) {
			return;
		}

		$requires_wp  = $plugin_data['RequiresWP'] ?? '';
		$requires_php = $plugin_data['RequiresPHP'] ?? '';

		if ( empty( $requires_wp ) && empty( $requires_php ) ) {
			return;
		}


		$hook = get_current_screen();
		if ( 'toplevel_page_bromate-rest-api-firewall' !== $hook->id ) {
			return;
		}

		if ( $requires_wp && version_compare( get_bloginfo( 'version' ), $requires_wp, '<' ) ) {
			echo '<div class="notice notice-error"><p>';
			/* translators: %s is the WordPress version */
			printf( esc_html__( 'Bromate Application Layer requires WordPress version %s.', 'bromate-rest-api-firewall' ), esc_html( $requires_wp ) );
			echo '</p></div>';
		}

		if ( $requires_php && version_compare( PHP_VERSION, $requires_php, '<' ) ) {
			echo '<div class="notice notice-error"><p>';
			/* translators: %s is the PHP version */
			printf( esc_html__( 'Bromate Application Layer requires PHP version %s.', 'bromate-rest-api-firewall' ), esc_html( $requires_php ) );
			echo '</p></div>';
		}
	}

	private static function load_script_config( $file_path ): array {
		$config = array();
		if ( FileUtils::is_readable( $file_path ) ) {
			$raw_config             = include realpath( $file_path );
			$config['dependencies'] = isset( $raw_config['dependencies'] ) ? array_map( 'sanitize_text_field', $raw_config['dependencies'] ) : array();
			$config['version']      = isset( $raw_config['version'] ) ? sanitize_text_field( $raw_config['version'] ) : '1.0.0';
		}
		return $config;
	}

}
