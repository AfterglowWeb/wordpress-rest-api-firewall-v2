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
			echo esc_html__( 'Bromate Application Layer encountered an error and could not be activated.', 'bromate-rest-api-firewall' );
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
			'bromate-rest-api-firewall',
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
			admin_url( 'admin.php?page=bromate-rest-api-firewall' ),
			esc_html__( 'Settings', 'bromate-rest-api-firewall' )
		);
		array_unshift( $links, $settings_link );
		return $links;
	}
);
