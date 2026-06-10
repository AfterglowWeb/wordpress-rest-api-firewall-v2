<?php namespace Bromate\RestApiFirewall;

defined( 'ABSPATH' ) || exit;

/**
 * Bromate REST API Firewall
 *
 * @package Bromate REST API Firewall
 * @author  Sophabed
 *
 * @wordpress-plugin
 * Plugin Name:       Bromate REST API Firewall
 * Version:           0.1.0
 * Description:       Security, access control and data protection for headless WordPress. Authentication, JWT support, route policies, rate limiting, response hardening and WordPress security tools in a single plugin.
 * Tags:              rest api, authentication, headless, firewall
 * Author:            Sophabed
 * Author URI:        https://www.moriskelly.com
 * Domain Path:       /languages
 * Requires PHP:      7.4
 * Requires at least: 6.0
 * Tested up to:      7.0
 * License: GNU General Public License v2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 */

define( 'BROMATE_REST_API_FIREWALL_VERSION', '0.1.0' );
define( 'BROMATE_REST_API_FIREWALL_DIR', plugin_dir_path( __FILE__ ) );
define( 'BROMATE_REST_API_FIREWALL_URL', plugin_dir_url( __FILE__ ) );
define( 'BROMATE_REST_API_FIREWALL_FILE', __FILE__ );

if ( file_exists( BROMATE_REST_API_FIREWALL_DIR . '/vendor/autoload.php' ) ) {
	require_once BROMATE_REST_API_FIREWALL_DIR . '/vendor/autoload.php';
} else {
	add_action(
		'admin_notices',
		function (): void {
			echo '<div class="notice notice-error"><p>';
			echo esc_html__( 'Bromate Application Layer encountered an error and could not be activated.', 'bromate-rest-application-layer' );
			echo '</p></div>';
		}
	);
	return;
}

register_activation_hook( __FILE__, array( Core\Bootstrap::class, 'activate' ) );

register_deactivation_hook( __FILE__, array( Core\Bootstrap::class, 'deactivate' ) );

add_action(
	'plugins_loaded',
	function (): void {
		Core\Bootstrap::register();
	},
	10
);

add_action(
	'init',
	function (): void {
		load_plugin_textdomain(
			'bromate-rest-application-layer',
			false,
			dirname( plugin_basename( __FILE__ ) ) . '/languages'
		);
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( array $links ): array {
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			admin_url( 'admin.php?page=bromate-rest-application-layer' ),
			esc_html__( 'Settings', 'bromate-rest-application-layer' )
		);
		array_unshift( $links, $settings_link );
		return $links;
	}
);

add_action(
	'admin_notices',
	function (): void {
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


		$admin_screen = get_current_screen();

		if ( ! $admin_screen instanceof \WP_Screen ) {
			return;
		}

		if( ! in_array(
			$screen_name,
			array(
				$admin_screen->base,
				$admin_screen->parent_base,
				$admin_screen->id,
			),
			true
		) ) {
			return;
		}

		if ( $requires_wp && version_compare( get_bloginfo( 'version' ), $requires_wp, '<' ) ) {
			echo '<div class="notice notice-error"><p>';
			/* translators: %s is the WordPress version */
			printf( esc_html__( 'Bromate Application Layer requires WordPress version %s.', 'bromate-rest-application-layer' ), esc_html( $requires_wp ) );
			echo '</p></div>';
		}

		if ( $requires_php && version_compare( PHP_VERSION, $requires_php, '<' ) ) {
			echo '<div class="notice notice-error"><p>';
			/* translators: %s is the PHP version */
			printf( esc_html__( 'Bromate Application Layer requires PHP version %s.', 'bromate-rest-application-layer' ), esc_html( $requires_php ) );
			echo '</p></div>';
		}
	}
);