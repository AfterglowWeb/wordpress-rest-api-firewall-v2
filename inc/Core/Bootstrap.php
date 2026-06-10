<?php namespace Bromate\RestApiFirewall\Core;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\SecurityBootstrap;
use Bromate\RestApiFirewall\Admin\AdminBootstrap;
use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;

final class Bootstrap {

	private function __construct() {}
	
	public static function register(): void {
        
		SecurityBootstrap::register();
		
		if ( is_admin() ) {
			AdminBootstrap::register();
    		SettingsAjaxController::register();
		}

        do_action('rest_api_firewall_loaded');
    }

	public static function activate(): void {
		$role = get_role( 'administrator' );
		if ( ! $role ) {
			return;
		}

		$caps = array( 'rest_api_firewall_edit_options' );

		foreach ( $caps as $cap ) {
			$role->add_cap( $cap );
		}

		if ( false === get_option( 'rest_api_firewall_options' ) ) {
			update_option(
				'rest_api_firewall_options',
				array(
					'version' => BROMATE_REST_API_FIREWALL_VERSION,
				),
				false
			);
		}

		flush_rewrite_rules();
	}

	public static function deactivate(): void {
		$role = get_role( 'administrator' );
		if ( ! $role ) {
			return;
		}

		$caps = array( 'rest_api_firewall_edit_options' );

		foreach ( $caps as $cap ) {
			$role->remove_cap( $cap );
		}

		delete_transient( 'rest_api_firewall_routes_list' );

		flush_rewrite_rules();
	}

	public static function uninstall(): void {
		if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
			return;
		}

		$caps  = array( 'rest_api_firewall_edit_options', 'rest_firewall_api_access' );
		$roles = wp_roles()->roles;

		foreach ( array_keys( $roles ) as $role_name ) {
			$role = get_role( $role_name );
			if ( $role ) {
				foreach ( $caps as $cap ) {
					$role->remove_cap( $cap );
				}
			}
		}

		delete_option( 'rest_api_firewall_options' );
		delete_transient( 'rest_api_firewall_routes_list' );

		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
				'blank_test_app_pass_%'
			)
		);
	}
}
