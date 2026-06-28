<?php namespace Bromate\RestApiFirewall\Core;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Api\Routing\RestRequestBootstrap;
use Bromate\RestApiFirewall\Api\Routing\PublicRequestBootstrap;
use Bromate\RestApiFirewall\Api\Routing\AdminLoginBootstrap;
use Bromate\RestApiFirewall\Security\Ip\IpEntryAjaxController;
use Bromate\RestApiFirewall\Admin\AdminPage;
use Bromate\RestApiFirewall\Admin\Documentation;
use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;
use Bromate\RestApiFirewall\Core\Schema\SchemaManager;

final class Bootstrap {

	private function __construct() {}

	public static function register(): void {
		add_action( 'plugins_loaded', array( SchemaManager::class, 'install' ), 1 );

		RestRequestBootstrap::register();
		PublicRequestBootstrap::register();
		AdminLoginBootstrap::register();
		AdminPage::register();
		SettingsAjaxController::register();
		IpEntryAjaxController::register();
		Documentation::register();
	}

	public static function activate(): void {
		SchemaManager::install();

		$role = get_role( 'administrator' );
		if ( $role ) {
			$role->add_cap( 'bromate_rest_api_firewall_edit_options' );
		}

		if ( false === get_option( 'bromate_rest_api_firewall_options' ) ) {
			update_option(
				'bromate_rest_api_firewall_options',
				array( 'version' => BROMATE_REST_API_FIREWALL_VERSION ),
				false
			);
		}

		flush_rewrite_rules();
	}

	public static function deactivate(): void {
		$role = get_role( 'administrator' );
		if ( $role ) {
			$role->remove_cap( 'bromate_rest_api_firewall_edit_options' );
		}

		delete_transient( 'bromate_rest_api_firewall_routes_list' );
		flush_rewrite_rules();
	}

	public static function uninstall(): void {
		if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
			return;
		}

		$caps = array( 'bromate_rest_api_firewall_edit_options', 'rest_firewall_api_access' );

		foreach ( array_keys( wp_roles()->roles ) as $role_name ) {
			$role = get_role( $role_name );
			if ( $role ) {
				foreach ( $caps as $cap ) {
					$role->remove_cap( $cap );
				}
			}
		}

		delete_option( 'bromate_rest_api_firewall_options' );
		delete_option( \Bromate\RestApiFirewall\Core\Schema\SchemaManager::OPTION_KEY );
		delete_transient( 'bromate_rest_api_firewall_routes_list' );

		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}bromate_firewall_ip_entries" );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}bromate_firewall_logs" );
	}
}
