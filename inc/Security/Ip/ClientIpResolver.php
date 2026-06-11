<?php namespace Bromate\RestApiFirewall\Security\Ip;

defined( 'ABSPATH' ) || exit;


class ClientIpResolver {

	public static function get_client_ip(): string {
		$candidates = array(
			sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '' ) ),
			sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_REAL_IP'] ?? '' ) ),
			// X-Forwarded-For may contain a comma-separated list; take the first (client) entry.
			trim( explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '' ) ) )[0] ),
			sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) ),
		);

		foreach ( $candidates as $ip ) {
			$ip = trim( $ip );
			if ( '' === $ip || ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
				continue;
			}

			// Normalise IPv4-mapped IPv6 (::ffff:1.2.3.4) → plain IPv4.
			if ( strpos( strtolower( $ip ), '::ffff:' ) === 0 ) {
				$v4 = substr( $ip, 7 );
				if ( filter_var( $v4, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
					return $v4;
				}
			}

			return $ip;
		}

		return '';
	}


}