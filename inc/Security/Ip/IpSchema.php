<?php namespace Bromate\RestApiFirewall\Security\Ip;


defined( 'ABSPATH' ) || exit;

use wpdb;

class IpSchema {

	const SCHEMA_VERSION = '1.1.0';
	const OPTION_KEY     = 'bromate_rest_api_firewall_ip_schema_version';

	public static function install(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$current = get_option( self::OPTION_KEY, '0.0.0' );

		if ( version_compare( $current, self::SCHEMA_VERSION, '<' ) ) {
			self::create_tables( $wpdb );
			self::maybe_alter_list_type_enum( $wpdb );
			update_option( self::OPTION_KEY, self::SCHEMA_VERSION, false );
		}
	}

	private static function maybe_alter_list_type_enum( wpdb $wpdb ): void {
		$table = $wpdb->prefix . 'bromate_rest_api_firewall_ip_entries';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- DDL statement, $table is $wpdb->prefix-derived, not user input
		$wpdb->query( "ALTER TABLE {$table} MODIFY list_type ENUM('whitelist','blacklist','global_blacklist') NOT NULL DEFAULT 'blacklist'" );
	}

	private static function create_tables( wpdb $wpdb ): void {
		$charset_collate = $wpdb->get_charset_collate();
		$table           = $wpdb->prefix . 'bromate_rest_api_firewall_ip_entries';

		$sql = "CREATE TABLE {$table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			ip VARCHAR(45) NOT NULL,
			list_type ENUM('whitelist','blacklist') NOT NULL DEFAULT 'blacklist',
			entry_type ENUM('manual','rate_limit') NOT NULL DEFAULT 'manual',
			agent VARCHAR(255) NULL,
			country_code CHAR(2) NULL,
			country_name VARCHAR(100) NULL,
			blocked_at DATETIME NOT NULL,
			expires_at DATETIME NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY ip_list (ip, list_type),
			KEY list_type (list_type),
			KEY entry_type (entry_type),
			KEY country_code (country_code),
			KEY blocked_at (blocked_at),
			KEY expires_at (expires_at)
		) {$charset_collate};";

		dbDelta( $sql );
	}
}
