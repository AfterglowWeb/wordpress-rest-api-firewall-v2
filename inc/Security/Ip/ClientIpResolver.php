<?php namespace Bromate\RestApiFirewall\Security\Ip;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Ip\CidrMatcher;

/**
 * Client IP Resolver
 * 
 * Resolves the client IP address from various HTTP headers with proper validation
 * and security considerations including support for CDNs, load balancers, and proxies.
 */
class ClientIpResolver {

	/**
	 * List of trusted proxy headers to check in order of preference
	 */
	private const IP_HEADERS = [
		'HTTP_CF_CONNECTING_IP',      // Cloudflare
		'HTTP_X_REAL_IP',              // Nginx/Apache
		'HTTP_X_FORWARDED_FOR',        // Standard proxy header
		'HTTP_X_CLUSTER_CLIENT_IP',    // Cluster environments
		'HTTP_X_FORWARDED',            // Alternative forward header
		'HTTP_FORWARDED_FOR',          // Alternative forward header
		'HTTP_FORWARDED',              // Alternative forward header
		'REMOTE_ADDR',                 // Fallback
	];

	/**
	 * Cache for resolved IP to avoid multiple lookups per request
	 */
	private static ?string $cached_ip = null;

	/**
	 * Cache for validation results
	 */
	private static array $validation_cache = [];

	/**
	 * Get the client IP address
	 * 
	 * @param bool $skip_validation Whether to skip IP validation (use with caution)
	 * @return string The client IP address or empty string if not found
	 */
	public static function get_client_ip( bool $skip_validation = false ): string {
		// Return cached IP if available
		if ( null !== self::$cached_ip ) {
			return self::$cached_ip;
		}

		$ip = self::resolve_ip_from_headers( $skip_validation );
		
		// Cache the result
		self::$cached_ip = $ip;
		
		return $ip;
	}

	/**
	 * Resolve IP from HTTP headers
	 * 
	 * @param bool $skip_validation Whether to skip IP validation
	 * @return string Resolved IP address
	 */
	private static function resolve_ip_from_headers( bool $skip_validation ): string {
		$headers = self::get_headers();

		foreach ( self::IP_HEADERS as $header ) {
			if ( ! isset( $headers[ $header ] ) || empty( $headers[ $header ] ) ) {
				continue;
			}

			$raw_ip = $headers[ $header ];
			
			// Handle comma-separated lists (e.g., X-Forwarded-For)
			if ( strpos( $raw_ip, ',' ) !== false ) {
				$ips = array_map( 'trim', explode( ',', $raw_ip ) );
				// Take the first IP (client) and continue checking
				foreach ( $ips as $ip ) {
					$validated_ip = self::validate_and_normalize_ip( $ip, $skip_validation );
					if ( $validated_ip ) {
						return $validated_ip;
					}
				}
			} else {
				$validated_ip = self::validate_and_normalize_ip( $raw_ip, $skip_validation );
				if ( $validated_ip ) {
					return $validated_ip;
				}
			}
		}

		return '';
	}

	/**
	 * Validate and normalize an IP address
	 * 
	 * @param string $ip Raw IP address
	 * @param bool $skip_validation Whether to skip validation
	 * @return string|false Validated IP or false if invalid
	 */
	private static function validate_and_normalize_ip( string $ip, bool $skip_validation = false ) {
		$ip = trim( $ip );
		
		if ( empty( $ip ) ) {
			return false;
		}

		// Check cache for validation result
		$cache_key = $ip . '_' . ( $skip_validation ? '1' : '0' );
		if ( isset( self::$validation_cache[ $cache_key ] ) ) {
			return self::$validation_cache[ $cache_key ];
		}

		// Validate IP format
		$flags = FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6;
		
		// Optionally reject private/reserved IPs
		if ( ! $skip_validation ) {
			$flags |= FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
		}

		if ( ! filter_var( $ip, FILTER_VALIDATE_IP, $flags ) ) {
			// If validation fails with strict flags, try without NO_PRIV_RANGE/NO_RES_RANGE
			// This is useful for private network setups
			if ( ! $skip_validation && filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6 ) ) {
				// IP is valid but is private/reserved
				// Check if we're in a trusted proxy environment
				if ( self::is_trusted_proxy_environment() ) {
					// Allow private IPs from trusted proxies
					$normalized = self::normalize_ip( $ip );
					self::$validation_cache[ $cache_key ] = $normalized;
					return $normalized;
				}
				return false;
			}
			self::$validation_cache[ $cache_key ] = false;
			return false;
		}

		$normalized = self::normalize_ip( $ip );
		self::$validation_cache[ $cache_key ] = $normalized;
		return $normalized;
	}

	/**
	 * Normalize IP address (handle IPv4-mapped IPv6)
	 * 
	 * @param string $ip IP address
	 * @return string Normalized IP address
	 */
	private static function normalize_ip( string $ip ): string {
		// Normalise IPv4-mapped IPv6 (::ffff:1.2.3.4) → plain IPv4
		$ip_lower = strtolower( $ip );
		if ( strpos( $ip_lower, '::ffff:' ) === 0 ) {
			$v4 = substr( $ip, 7 );
			if ( filter_var( $v4, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
				return $v4;
			}
		}

		// Normalize IPv6 (remove leading zeros, compress)
		if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) ) {
			try {
				$ip_obj = \inet_pton( $ip );
				if ( false !== $ip_obj ) {
					$normalized = \inet_ntop( $ip_obj );
					if ( false !== $normalized ) {
						return $normalized;
					}
				}
			} catch ( \Exception $e ) {
				// Fall back to original
			}
		}

		return $ip;
	}

	/**
	 * Get all HTTP headers
	 * 
	 * @return array Headers array
	 */
	private static function get_headers(): array {
		$headers = [];
		
		// Get headers from $_SERVER
		foreach ( self::IP_HEADERS as $header ) {
			if ( isset( $_SERVER[ $header ] ) ) {
				$value = sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) );
				if ( ! empty( $value ) ) {
					$headers[ $header ] = $value;
				}
			}
		}
		
		// Also check getallheaders() for additional headers (Apache/Nginx)
		if ( function_exists( 'getallheaders' ) ) {
			$all_headers = getallheaders();
			if ( is_array( $all_headers ) ) {
				foreach ( self::IP_HEADERS as $header ) {
					$key = str_replace( 'HTTP_', '', $header );
					$key = str_replace( '_', '-', $key );
					$key = strtolower( $key );
					
					// Check case-insensitive
					foreach ( $all_headers as $name => $value ) {
						if ( strtolower( $name ) === $key && ! empty( $value ) ) {
							$headers[ $header ] = sanitize_text_field( wp_unslash( $value ) );
							break;
						}
					}
				}
			}
		}
		
		return $headers;
	}

	/**
	 * Check if we're in a trusted proxy environment
	 * 
	 * @return bool True if in trusted proxy environment
	 */
	private static function is_trusted_proxy_environment(): bool {
		// Allow configuration via filter
		$trusted_proxies = apply_filters( 'bromate_trusted_proxy_ips', [] );
		
		if ( empty( $trusted_proxies ) ) {
			// Default: trust private IPs if X-Forwarded-For is present
			return isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) && ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] );
		}
		
		// Check if the request comes from a trusted proxy
		$remote_ip = $_SERVER['REMOTE_ADDR'] ?? '';
		if ( ! empty( $remote_ip ) ) {
			foreach ( $trusted_proxies as $proxy_ip ) {
				if ( CidrMatcher::ip_matches( $remote_ip, $proxy_ip ) ) {
					return true;
				}
			}
		}
		
		return false;
	}

	/**
	 * Check if an IP is in a given CIDR range using CidrMatcher
	 * 
	 * @param string $ip IP address to check
	 * @param string $range CIDR range (e.g., "192.168.1.0/24")
	 * @return bool True if IP is in range
	 */
	public static function ip_in_range( string $ip, string $range ): bool {
		return CidrMatcher::ip_matches( $ip, $range );
	}

	/**
	 * Get the client IP with geolocation data using GeoIpApi
	 * 
	 * @return array IP with geolocation data
	 */
	public static function get_client_ip_with_geo(): array {
		$ip = self::get_client_ip();
		
		if ( empty( $ip ) ) {
			return [
				'ip' => '',
				'country' => '',
				'country_name' => '',
				'city' => '',
				'latitude' => '',
				'longitude' => '',
				'isp' => '',
			];
		}
		
		$geo_data = GeoIpApi::get_geoip( $ip );
		
		return array_merge(
			[ 'ip' => $ip ],
			$geo_data
		);
	}

	/**
	 * Get country code for an IP using GeoIpApi
	 * 
	 * @param string $ip IP address
	 * @return string Country code
	 */
	public static function get_country_code( string $ip ): string {
		return GeoIpApi::get_country_code( $ip );
	}

	/**
	 * Check if IP is blocked by country or blacklist using IpAccessControl
	 * 
	 * @param string $ip IP address to check
	 * @return bool|WP_Error True if allowed, WP_Error if blocked
	 */
	public static function check_ip_access( string $ip ) {
		return IpAccessControl::inspect();
	}

	/**
	 * Clear the IP cache (useful for testing)
	 */
	public static function clear_cache(): void {
		self::$cached_ip = null;
		self::$validation_cache = [];
	}

	/**
	 * Check if an IP is in a private range
	 * 
	 * @param string $ip IP address to check
	 * @return bool True if IP is private
	 */
	public static function is_private_ip( string $ip ): bool {
		$private_ranges = [
			'10.0.0.0/8',
			'172.16.0.0/12',
			'192.168.0.0/16',
			'127.0.0.0/8',
			'::1/128',
			'fc00::/7',
			'fe80::/10',
		];
		
		foreach ( $private_ranges as $range ) {
			if ( CidrMatcher::ip_matches( $ip, $range ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get a hash of the IP address for storage (anonymized)
	 * 
	 * @param string $ip IP address
	 * @param bool $anonymize Whether to anonymize the IP
	 * @return string Hashed IP
	 */
	public static function hash_ip( string $ip, bool $anonymize = true ): string {
		if ( $anonymize ) {
			// For IPv4, zero out the last octet
			if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
				$parts = explode( '.', $ip );
				if ( count( $parts ) === 4 ) {
					$parts[3] = '0';
					$ip = implode( '.', $parts );
				}
			}
			// For IPv6, zero out the last 80 bits (keep only /48)
			elseif ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) ) {
				try {
					$ip_obj = \inet_pton( $ip );
					if ( false !== $ip_obj ) {
						// Zero out last 10 bytes (80 bits) for /48
						$ip_obj = substr( $ip_obj, 0, 6 ) . str_repeat( "\x00", 10 );
						$ip = \inet_ntop( $ip_obj );
					}
				} catch ( \Exception $e ) {
					// Fall back to hashing
				}
			}
		}
		
		return hash( 'sha256', $ip );
	}

	/**
	 * Get all IP headers for debugging
	 * 
	 * @return array All IP headers with values
	 */
	public static function get_ip_headers(): array {
		$headers = [];
		
		foreach ( self::IP_HEADERS as $header ) {
			if ( isset( $_SERVER[ $header ] ) ) {
				$headers[ $header ] = sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) );
			}
		}
		
		return $headers;
	}
}