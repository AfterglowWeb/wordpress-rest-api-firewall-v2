<?php namespace Bromate\RestApiFirewall\Security\Network;

defined( 'ABSPATH' ) || exit;

class IpEntryRepository {

	protected static function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'rest_api_firewall_ip_entries';
	}

	public static function entry_config(): array {
		return array(
			'id'           => array(
				'type'     => 'integer',
				'sortable' => true,
			),
			'ip'           => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_text_field',
				'sortable'          => true,
			),
			'list_type'    => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => 'blacklist',
				'allowed_values'    => array( 'whitelist', 'blacklist', 'global_blacklist' ),
				'sortable'          => true,
			),
			'entry_type'   => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => 'manual',
				'allowed_values'    => array( 'manual', 'rate_limit' ),
				'sortable'          => true,
			),
			'agent'        => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => null,
				'sortable'          => false,
			),
			'country_code' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => null,
				'sortable'          => true,
			),
			'country_name' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => null,
				'sortable'          => true,
			),
			'blocked_at'   => array(
				'type'     => 'datetime',
				'default'  => null,
				'sortable' => true,
			),
			'expires_at'   => array(
				'type'     => 'datetime',
				'default'  => null,
				'sortable' => true,
			),
			'created_at'   => array(
				'type'     => 'datetime',
				'sortable' => true,
			),
			'updated_at'   => array(
				'type'     => 'datetime',
				'sortable' => true,
			),
		);
	}

	public static function get_entries( array $args = array() ): array {
		global $wpdb;

		$defaults = array(
			'list_type'  => null,
			'entry_type' => null,
			'search'     => null,
			'page'       => 1,
			'per_page'   => 25,
			'order_by'   => 'blocked_at',
			'order'      => 'DESC',
		);

		$args   = wp_parse_args( $args, $defaults );
		$table  = self::table();
		$where  = array( '1=1' );
		$values = array();
		$config = self::entry_config();

		if ( ! empty( $args['list_type'] ) ) {
			$where[]  = 'list_type = %s';
			$values[] = $args['list_type'];
		}

		if ( ! empty( $args['entry_type'] ) ) {
			$where[]  = 'entry_type = %s';
			$values[] = $args['entry_type'];
		}

		if ( ! isset( $args['include_expired'] ) || ! $args['include_expired'] ) {
			$where[] = '(expires_at IS NULL OR expires_at > NOW())';
		}

		if ( ! empty( $args['search'] ) ) {
			$search   = '%' . $wpdb->esc_like( $args['search'] ) . '%';
			$where[]  = '(ip LIKE %s OR country_name LIKE %s OR agent LIKE %s)';
			$values[] = $search;
			$values[] = $search;
			$values[] = $search;
		}

		$order_by = 'blocked_at';
		if ( isset( $config[ $args['order_by'] ] ) && ! empty( $config[ $args['order_by'] ]['sortable'] ) ) {
			$order_by = $args['order_by'];
		}

		$order    = strtoupper( $args['order'] ) === 'ASC' ? 'ASC' : 'DESC';
		$page     = max( 1, (int) $args['page'] );
		$per_page = max( 1, min( 100, (int) $args['per_page'] ) );
		$offset   = ( $page - 1 ) * $per_page;

		$where_clause = implode( ' AND ', $where );

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where_clause}";
		if ( ! empty( $values ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- SQL built from whitelisted column names and %s/%d placeholders only
			$count_sql = $wpdb->prepare( $count_sql, $values );
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$total = (int) $wpdb->get_var( $count_sql );

		$sql      = "SELECT * FROM {$table} WHERE {$where_clause} ORDER BY {$order_by} {$order} LIMIT %d OFFSET %d";
		$values[] = $per_page;
		$values[] = $offset;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$entries = $wpdb->get_results( $wpdb->prepare( $sql, $values ), ARRAY_A );

		return array(
			'entries'     => array_map( array( self::class, 'normalize' ), is_array( $entries ) ? $entries : array() ),
			'total'       => $total,
			'page'        => $page,
			'per_page'    => $per_page,
			'total_pages' => ceil( $total / $per_page ),
		);
	}

	public static function find_by_ip( string $ip, string $list_type = 'blacklist' ): ?array {
		global $wpdb;

		$sql = 'SELECT * FROM ' . self::table() . ' WHERE ip = %s AND list_type = %s LIMIT 1';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $ip, $list_type ), ARRAY_A );

		return $row ? self::normalize( $row ) : null;
	}

	public static function ip_exists( string $ip, string $list_type = 'blacklist' ): bool {
		global $wpdb;

		$sql = 'SELECT COUNT(*) FROM ' . self::table() . '
				WHERE ip = %s AND list_type = %s
				AND (expires_at IS NULL OR expires_at > NOW())';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		return (int) $wpdb->get_var( $wpdb->prepare( $sql, $ip, $list_type ) ) > 0;
	}

	public static function ip_in_list( string $ip, string $list_type = 'blacklist' ): bool {
		global $wpdb;

		// Fast path: exact IP match.
		if ( self::ip_exists( $ip, $list_type ) ) {
			return true;
		}

		// Slow path: CIDR entries.
		$sql = 'SELECT ip FROM ' . self::table() . ' WHERE list_type = %s AND ip LIKE %s AND (expires_at IS NULL OR expires_at > NOW())';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$cidrs = $wpdb->get_col( $wpdb->prepare( $sql, $list_type, '%/%' ) );

		foreach ( $cidrs as $cidr ) {
			if ( CidrMatcher::matches( $ip, $cidr ) ) {
				return true;
			}
		}

		return false;
	}

	public static function insert( array $data ) {
		global $wpdb;

		$sanitized = self::sanitize_entry( $data );
		if ( ! $sanitized ) {
			return false;
		}

		$now                     = current_time( 'mysql' );
		$sanitized['created_at'] = $now;
		$sanitized['updated_at'] = $now;

		if ( empty( $sanitized['blocked_at'] ) ) {
			$sanitized['blocked_at'] = $now;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$result = $wpdb->insert( self::table(), $sanitized );

		return $result ? $wpdb->insert_id : false;
	}

	public static function update( int $id, array $data ): bool {
		global $wpdb;

		$sanitized = self::sanitize_entry( $data, false );
		if ( empty( $sanitized ) ) {
			return false;
		}

		$sanitized['updated_at'] = current_time( 'mysql' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (bool) $wpdb->update( self::table(), $sanitized, array( 'id' => $id ) );
	}

	public static function delete( int $id ): bool {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (bool) $wpdb->delete( self::table(), array( 'id' => $id ) );
	}

	public static function delete_many( array $ids ): int {
		global $wpdb;

		if ( empty( $ids ) ) {
			return 0;
		}

		$ids          = array_map( 'absint', $ids );
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$sql          = 'DELETE FROM ' . self::table() . " WHERE id IN ({$placeholders})";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- placeholders generated from validated integer IDs
		return (int) $wpdb->query( $wpdb->prepare( $sql, $ids ) );
	}

	public static function update_expiry_for_ids( array $ids, int $expiry_seconds ): int {
		global $wpdb;

		if ( empty( $ids ) ) {
			return 0;
		}

		$expires_at   = $expiry_seconds > 0
			? gmdate( 'Y-m-d H:i:s', time() + $expiry_seconds )
			: null;
		$now          = current_time( 'mysql' );
		$ids          = array_map( 'absint', $ids );
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

		if ( null === $expires_at ) {
			$values = array_merge( array( $now ), $ids );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			return (int) $wpdb->query( $wpdb->prepare( 'UPDATE ' . self::table() . " SET expires_at = NULL, updated_at = %s WHERE id IN ({$placeholders})", $values ) );
		}

		$values = array_merge( array( $expires_at, $now ), $ids );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		return (int) $wpdb->query( $wpdb->prepare( 'UPDATE ' . self::table() . " SET expires_at = %s, updated_at = %s WHERE id IN ({$placeholders})", $values ) );
	}

	public static function update_expiry_for_list( string $list_type, int $expiry_seconds ): int {
		global $wpdb;

		$expires_at = $expiry_seconds > 0
			? gmdate( 'Y-m-d H:i:s', time() + $expiry_seconds )
			: null;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->update(
			self::table(),
			array(
				'expires_at' => $expires_at,
				'updated_at' => current_time( 'mysql' ),
			),
			array( 'list_type' => $list_type )
		);
	}

	public static function delete_expired(): int {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- static SQL, no user input
		return (int) $wpdb->query( 'DELETE FROM ' . self::table() . ' WHERE expires_at IS NOT NULL AND expires_at < NOW()' );
	}

	public static function get_country_stats( string $list_type = 'blacklist' ): array {
		global $wpdb;

		$sql = 'SELECT country_code, country_name, COUNT(*) as count
				FROM ' . self::table() . '
				WHERE list_type = %s
				AND (expires_at IS NULL OR expires_at > NOW())
				AND country_code IS NOT NULL
				GROUP BY country_code, country_name
				ORDER BY count DESC';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$results = $wpdb->get_results( $wpdb->prepare( $sql, $list_type ), ARRAY_A );
		return is_array( $results ) ? $results : array();
	}

	protected static function sanitize_entry( array $data, bool $require_ip = true ): ?array {
		$config    = self::entry_config();
		$sanitized = array();

		foreach ( $config as $key => $field_config ) {
			if ( in_array( $key, array( 'id', 'created_at', 'updated_at' ), true ) ) {
				continue;
			}

			if ( ! isset( $data[ $key ] ) ) {
				continue;
			}

			$value = $data[ $key ];

			if ( ! empty( $field_config['sanitize_callback'] ) && is_callable( $field_config['sanitize_callback'] ) ) {
				$value = call_user_func( $field_config['sanitize_callback'], $value );
			}

			if ( ! empty( $field_config['allowed_values'] ) && ! in_array( $value, $field_config['allowed_values'], true ) ) {
				$value = $field_config['default'] ?? null;
			}

			$sanitized[ $key ] = $value;
		}

		if ( $require_ip && ( empty( $sanitized['ip'] ) || ! self::is_valid_ip_or_cidr( $sanitized['ip'] ) ) ) {
			return null;
		}

		return $sanitized;
	}

	protected static function normalize( array $row ): array {
		return array(
			'id'           => (int) $row['id'],
			'ip'           => $row['ip'],
			'list_type'    => $row['list_type'],
			'entry_type'   => $row['entry_type'],
			'agent'        => $row['agent'],
			'country_code' => $row['country_code'],
			'country_name' => $row['country_name'],
			'blocked_at'   => $row['blocked_at'],
			'expires_at'   => $row['expires_at'],
			'created_at'   => $row['created_at'],
			'updated_at'   => $row['updated_at'],
		);
	}

	public static function is_valid_ip_or_cidr( string $entry ): bool {
		if ( strpos( $entry, '/' ) !== false ) {
			$parts = explode( '/', $entry );
			if ( count( $parts ) !== 2 ) {
				return false;
			}

			list( $ip, $mask ) = $parts;

			if ( ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
				return false;
			}

			$mask = (int) $mask;

			if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
				return $mask >= 0 && $mask <= 32;
			}

			if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) ) {
				return $mask >= 0 && $mask <= 128;
			}

			return false;
		}

		return filter_var( $entry, FILTER_VALIDATE_IP ) !== false;
	}
}
