<?php namespace Bromate\RestApiFirewall\Security\Ip;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;
use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Security\Ip\IpEntryRepository;
use Bromate\RestApiFirewall\Security\Ip\CidrMatcher;
use Bromate\RestApiFirewall\Security\Ip\GeoIpApi;

class IpEntryAjaxController {

	private function __construct() {}

	public static function register(): void {
		$self = new self();
		add_action( 'wp_ajax_get_global_ip_filter', array( $self, 'ajax_get_ip_filter' ) );
		add_action( 'wp_ajax_save_global_ip_filter', array( $self, 'ajax_save_ip_filter' ) );
	}

	public function ajax_get_ip_entries(): void {

		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$list_type = isset( $_POST['list_type'] ) ? sanitize_text_field( wp_unslash( $_POST['list_type'] ) ) : 'blacklist';

		$result = IpEntryRepository::get_entries( array( 'list_type' => $list_type ) );

		wp_send_json_success( array( 'entries' => $result['entries'] ?? array() ), 200 );
	}

	public function ajax_add_ip_entry(): void {

		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:disable WordPress.Security.NonceVerification.Missing
		$ip        = isset( $_POST['ip'] ) ? sanitize_text_field( wp_unslash( $_POST['ip'] ) ) : '';
		$list_type = isset( $_POST['list_type'] ) ? sanitize_text_field( wp_unslash( $_POST['list_type'] ) ) : 'blacklist';
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		if ( empty( $ip ) || ! CidrMatcher::is_valid_ip_or_cidr( $ip ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid IP address', 'bromate-rest-api-firewall' ) ), 400 );
		}

		if ( IpEntryRepository::find_by_ip( $ip, $list_type ) ) {
			wp_send_json_error( array( 'message' => __( 'IP already in list', 'bromate-rest-api-firewall' ) ), 400 );
		}

		$expiry_seconds = (int) SettingsRepository::read_option('expiry_seconds');
		$expires_at     = $expiry_seconds > 0
			? gmdate( 'Y-m-d H:i:s', time() + $expiry_seconds )
			: null;

		$data = array(
			'ip'         => $ip,
			'list_type'  => $list_type,
			'entry_type' => 'manual',
			'expires_at' => $expires_at,
		);

		$geoip = GeoIpApi::get_geoip( $ip );
		if ( $geoip ) {
			$data['country_code'] = $geoip['country'] ?? null;
			$data['country_name'] = $geoip['countryName'] ?? null;
		}

		$id = IpEntryRepository::insert( $data );

		if ( ! $id ) {
			wp_send_json_error( array( 'message' => __( 'Failed to add IP entry', 'bromate-rest-api-firewall' ) ), 500 );
		}

		$entry = IpEntryRepository::find_by_ip( $ip, $list_type );

		wp_send_json_success( array( 'entry' => $entry ), 201 );
	}

	public function ajax_delete_ip_entry(): void {

		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;

		if ( ! $id ) {
			wp_send_json_error( array( 'message' => __( 'Entry ID required', 'bromate-rest-api-firewall' ) ), 400 );
		}

		$deleted = IpEntryRepository::delete( $id );

		if ( ! $deleted ) {
			wp_send_json_error( array( 'message' => __( 'Entry not found', 'bromate-rest-api-firewall' ) ), 404 );
		}

		wp_send_json_success( array( 'deleted' => true ), 200 );
	}

	public function ajax_delete_ip_entries(): void {

		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$ids = isset( $_POST['ids'] ) ? sanitize_text_field( wp_unslash( $_POST['ids'] ) ) : array();
		if ( is_string( $ids ) ) {
			$ids = json_decode( $ids, true );
		}

		if ( ! is_array( $ids ) || empty( $ids ) ) {
			wp_send_json_error( array( 'message' => __( 'No entries selected', 'bromate-rest-api-firewall' ) ), 400 );
		}

		$count = IpEntryRepository::delete_many( $ids );

		wp_send_json_success( array( 'deleted' => $count ), 200 );
	}

	public function ajax_get_country_stats(): void {
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$list_type = isset( $_POST['list_type'] ) ? sanitize_text_field( wp_unslash( $_POST['list_type'] ) ) : 'blacklist';

		$stats = IpEntryRepository::get_country_stats( $list_type );

		wp_send_json_success(
			array(
				'countries'         => GeoIpApi::get_all_countries(),
				'stats'             => $stats,
				'blocked_countries' => array(),
			),
			200
		);
	}
}
