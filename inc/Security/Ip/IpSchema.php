<?php namespace Bromate\RestApiFirewall\Security\Ip;

defined( 'ABSPATH' ) || exit;

use wpdb;

class IpSchema {

	const SCHEMA_VERSION = '1.6.6';
	const OPTION_KEY     = 'bromate_rest_api_firewall_ip_schema_version';

	public static function install(): void {

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		global $wpdb;

		$current = get_option( self::OPTION_KEY, '0.0.0' );

		if ( version_compare( $current, self::SCHEMA_VERSION, '<' ) ) {
			self::create_tables( $wpdb );
			update_option( self::OPTION_KEY, self::SCHEMA_VERSION, false );
		}
	}

	private static function create_tables( wpdb $wpdb ): void {
		$charset_collate = $wpdb->get_charset_collate();
		$table           = $wpdb->prefix . 'bromate_rest_api_firewall_ip_entries';

		$sql = "CREATE TABLE {$table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			ip VARCHAR(45) NOT NULL,
			list_type ENUM('whitelist','blacklist') NOT NULL DEFAULT 'blacklist',
			entry_type ENUM('ip','cidr') NOT NULL DEFAULT 'ip',
			entry_origin ENUM('manual','rate_limit') NOT NULL DEFAULT 'manual',
			agent VARCHAR(255) NULL,
			user_id BIGINT UNSIGNED NULL DEFAULT NULL,
			referrer VARCHAR(255) NULL DEFAULT NULL,
			country_code CHAR(2) NULL,
			country_name VARCHAR(100) NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			expires_at DATETIME DEFAULT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY ip_list (ip, list_type),
			KEY list_type (list_type),
			KEY entry_type (entry_type),
			KEY entry_origin (entry_origin),
			KEY user_id (user_id),
			KEY country_code (country_code),
			KEY created_at (created_at)
		) {$charset_collate};";

		dbDelta( $sql );
	}
}