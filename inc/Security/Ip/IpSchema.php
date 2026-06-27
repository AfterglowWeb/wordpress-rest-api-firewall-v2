<?php namespace Bromate\RestApiFirewall\Security\Ip;

defined( 'ABSPATH' ) || exit;

use wpdb;

class IpSchema {

	const SCHEMA_VERSION = '1.4.3';
	const OPTION_KEY     = 'bromate_rest_api_firewall_ip_schema_version';

	public static function install(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$current = get_option( self::OPTION_KEY, '0.0.0' );

		if ( version_compare( $current, self::SCHEMA_VERSION, '<' ) ) {
			self::create_tables( $wpdb );
			self::maybe_alter_list_type_enum( $wpdb );
			self::maybe_drop_expires_at( $wpdb );
			self::maybe_add_user_id( $wpdb );
			update_option( self::OPTION_KEY, self::SCHEMA_VERSION, false );
		}
	}

	private static function maybe_alter_list_type_enum( wpdb $wpdb ): void {
		$table = $wpdb->prefix . 'bromate_rest_api_firewall_ip_entries';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "ALTER TABLE {$table} MODIFY list_type ENUM('whitelist','blacklist') NOT NULL DEFAULT 'blacklist'" );
	}

	private static function maybe_drop_expires_at( wpdb $wpdb ): void {
    $table = $wpdb->prefix . 'bromate_rest_api_firewall_ip_entries';
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $col = $wpdb->get_results( "SHOW COLUMNS FROM {$table} LIKE 'expires_at'" );
    if ( empty( $col ) ) {
        return; // already gone, nothing to do
    }

    // Check if the index exists before trying to drop it
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $idx = $wpdb->get_results( "SHOW INDEX FROM {$table} WHERE Key_name = 'expires_at'" );
    if ( ! empty( $idx ) ) {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "ALTER TABLE {$table} DROP INDEX expires_at" );
    }

    // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $wpdb->query( "ALTER TABLE {$table} DROP COLUMN expires_at" );
}

	private static function maybe_add_user_id( wpdb $wpdb ): void {
    $table = $wpdb->prefix . 'bromate_rest_api_firewall_ip_entries';
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $col = $wpdb->get_results( "SHOW COLUMNS FROM {$table} LIKE 'user_id'" );
    if ( ! empty( $col ) ) {
        return; // already exists
    }
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $result = $wpdb->query( "ALTER TABLE {$table} ADD COLUMN user_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER agent" );
    // Add the index separately — combining ADD COLUMN + ADD KEY in one ALTER
    // can silently fail on some MySQL/MariaDB versions
    if ( $result !== false ) {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "ALTER TABLE {$table} ADD KEY user_id (user_id)" );
    }
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
			user_id BIGINT UNSIGNED NULL DEFAULT NULL,
			country_code CHAR(2) NULL,
			country_name VARCHAR(100) NULL,
			blocked_at DATETIME NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY ip_list (ip, list_type),
			KEY list_type (list_type),
			KEY entry_type (entry_type),
			KEY user_id (user_id),
			KEY country_code (country_code),
			KEY blocked_at (blocked_at)
		) {$charset_collate};";

		dbDelta( $sql );
	}
}