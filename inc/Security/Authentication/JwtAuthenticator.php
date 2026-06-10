<?php namespace Bromate\RestApiFirewall\Security\Authentication;

defined( 'ABSPATH' ) || exit;

use Throwable;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtAuthenticator {

	/**
	 * Validate a Bearer JWT from the current request against the provided config.
	 *
	 * @param array $config {
	 *   @type string $algorithm  JWT algorithm (HS256, RS256, …). Default 'RS256'.
	 *   @type string $public_key PEM public key or HMAC shared secret.
	 *   @type string $audience   Expected aud claim (optional).
	 *   @type string $issuer     Expected iss claim (optional).
	 * }
	 * @return bool True when the token is valid, false otherwise.
	 */
	public static function validate_bearer_jwt( array $config ): bool {

		$token = self::extract_bearer_token();

		if ( null === $token ) {
			return false;
		}

		$algorithm  = $config['algorithm'] ?? 'RS256';
		$public_key = $config['public_key'] ?? '';
		$audience   = $config['audience'] ?? '';
		$issuer     = $config['issuer'] ?? '';

		if ( empty( $public_key ) ) {
			return false;
		}

		try {
			$decoded = JWT::decode( $token, new Key( $public_key, $algorithm ) );
		} catch ( Throwable $e ) {
			return false;
		}

		if ( ! empty( $audience ) && ( $decoded->aud ?? null ) !== $audience ) {
			return false;
		}

		if ( ! empty( $issuer ) && ( $decoded->iss ?? null ) !== $issuer ) {
			return false;
		}

		return true;
	}

	/**
	 * Extract the raw Bearer token string from the Authorization header.
	 *
	 * @return string|null The token, or null if no Bearer header is present.
	 */
	public static function extract_bearer_token(): ?string {

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized below
		$auth = isset( $_SERVER['HTTP_AUTHORIZATION'] )
			? sanitize_text_field( wp_unslash( $_SERVER['HTTP_AUTHORIZATION'] ) )
			: '';

		if ( empty( $auth ) && function_exists( 'getallheaders' ) ) {
			$headers = getallheaders();
			$auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';
		}

		if ( ! is_string( $auth ) || stripos( $auth, 'bearer ' ) !== 0 ) {
			return null;
		}

		return trim( substr( $auth, 7 ) );
	}

	/**
	 * Decode and return the JWT payload without verifying the signature.
	 * Useful for debugging — do not use for authentication decisions.
	 *
	 * @param string $token Raw JWT string.
	 * @return array|null Decoded payload, or null if the token is malformed.
	 */
	public static function extract_payload( string $token ): ?array {

		$parts = explode( '.', $token );

		if ( count( $parts ) !== 3 ) {
			return null;
		}

		$payload = json_decode(
			base64_decode( strtr( $parts[1], '-_', '+/' ) ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- base64url decoding JWT payload, not obfuscation
			true
		);

		return is_array( $payload ) ? $payload : null;
	}
}
