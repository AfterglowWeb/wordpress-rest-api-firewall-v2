<?php declare(strict_types=1);

namespace Tests\Unit\Firewall;

use Brain\Monkey;
use cmk\RestApiFirewall\Firewall\AuthJWT;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use PHPUnit\Framework\TestCase;

/**
 * Tests for AuthJWT (free plugin feature, also inherited by the pro tier).
 *
 * Covers:
 *   - extract_payload()     — pure base64url decoding, no WP dependencies
 *   - extract_bearer_token() — reads $_SERVER, calls sanitize_text_field / wp_unslash
 *   - validate_bearer_jwt() — firebase/php-jwt validation (HS256 + RS256)
 */
class AuthJWTTest extends TestCase {

    // -----------------------------------------------------------------------
    // RSA key pair shared across the test class (generated once per run).
    // -----------------------------------------------------------------------

    private static string $rsaPrivateKeyPem;
    private static string $rsaPublicKeyPem;

    // Saved $_SERVER state so tests do not bleed into each other.
    private array $originalServer;

    // -----------------------------------------------------------------------
    // Class-level setup — generate a throwaway RSA-2048 key pair.
    // -----------------------------------------------------------------------

    public static function setUpBeforeClass(): void {
        parent::setUpBeforeClass();

        $resource = openssl_pkey_new([
            'digest_alg'       => 'sha256',
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);

        openssl_pkey_export( $resource, $privateKey );
        self::$rsaPrivateKeyPem = $privateKey;
        self::$rsaPublicKeyPem  = openssl_pkey_get_details( $resource )['key'];
    }

    // -----------------------------------------------------------------------
    // Per-test setup/teardown — Brain\Monkey + $_SERVER isolation.
    // -----------------------------------------------------------------------

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
        $this->originalServer = $_SERVER;

        // Stubs: pass-through — the real logic does not change the value.
        Monkey\Functions\stubs([
            'sanitize_text_field' => static fn( $v ) => $v,
            'wp_unslash'          => static fn( $v ) => $v,
        ]);
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        $_SERVER = $this->originalServer;
        parent::tearDown();
    }

    // -----------------------------------------------------------------------
    // extract_payload()
    // -----------------------------------------------------------------------

    /** @test */
    public function extract_payload_returns_array_for_valid_jwt(): void {
        // Mint a HS256 token with a known payload.
        $token   = JWT::encode( [ 'sub' => 'test', 'aud' => 'api' ], 'secret', 'HS256' );
        $payload = AuthJWT::extract_payload( $token );

        $this->assertIsArray( $payload );
        $this->assertSame( 'test', $payload['sub'] );
        $this->assertSame( 'api',  $payload['aud'] );
    }

    /** @test */
    public function extract_payload_returns_null_for_non_three_part_string(): void {
        $this->assertNull( AuthJWT::extract_payload( 'only.two' ) );
        $this->assertNull( AuthJWT::extract_payload( 'one' ) );
        $this->assertNull( AuthJWT::extract_payload( '' ) );
    }

    /** @test */
    public function extract_payload_returns_null_for_invalid_base64_payload(): void {
        // Craft a 3-part string whose middle part is invalid base64url.
        $this->assertNull( AuthJWT::extract_payload( 'header.!!!.signature' ) );
    }

    // -----------------------------------------------------------------------
    // extract_bearer_token()
    // -----------------------------------------------------------------------

    /** @test */
    public function extract_bearer_token_returns_token_when_bearer_header_present(): void {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer my.jwt.token';

        $this->assertSame( 'my.jwt.token', AuthJWT::extract_bearer_token() );
    }

    /** @test */
    public function extract_bearer_token_returns_null_when_no_header(): void {
        unset( $_SERVER['HTTP_AUTHORIZATION'] );

        $this->assertNull( AuthJWT::extract_bearer_token() );
    }

    /** @test */
    public function extract_bearer_token_returns_null_for_basic_auth_prefix(): void {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Basic dXNlcjpwYXNz';

        $this->assertNull( AuthJWT::extract_bearer_token() );
    }

    /** @test */
    public function extract_bearer_token_is_case_insensitive_for_bearer_prefix(): void {
        $_SERVER['HTTP_AUTHORIZATION'] = 'bearer lowercase.token.here';

        $this->assertSame( 'lowercase.token.here', AuthJWT::extract_bearer_token() );
    }

    // -----------------------------------------------------------------------
    // validate_bearer_jwt() — HS256
    // -----------------------------------------------------------------------

    /** @test */
    public function validate_bearer_jwt_returns_true_for_valid_hs256_token(): void {
        $secret = 'super-secret-key';
        $token  = JWT::encode( [ 'sub' => 'svc' ], $secret, 'HS256' );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        $this->assertTrue( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'HS256',
            'public_key' => $secret,
        ] ) );
    }

    /** @test */
    public function validate_bearer_jwt_returns_false_for_hs256_wrong_secret(): void {
        $token = JWT::encode( [ 'sub' => 'svc' ], 'correct-secret', 'HS256' );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        $this->assertFalse( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'HS256',
            'public_key' => 'wrong-secret',
        ] ) );
    }

    // -----------------------------------------------------------------------
    // validate_bearer_jwt() — RS256
    // -----------------------------------------------------------------------

    /** @test */
    public function validate_bearer_jwt_returns_true_for_valid_rs256_token(): void {
        $token = JWT::encode( [ 'sub' => 'next-js' ], self::$rsaPrivateKeyPem, 'RS256' );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        $this->assertTrue( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'RS256',
            'public_key' => self::$rsaPublicKeyPem,
        ] ) );
    }

    /** @test */
    public function validate_bearer_jwt_returns_false_for_rs256_wrong_public_key(): void {
        $token = JWT::encode( [ 'sub' => 'next-js' ], self::$rsaPrivateKeyPem, 'RS256' );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        // Generate a different key pair for a mismatching public key.
        $other = openssl_pkey_new( [ 'digest_alg' => 'sha256', 'private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA ] );
        $wrongPublicKey = openssl_pkey_get_details( $other )['key'];

        $this->assertFalse( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'RS256',
            'public_key' => $wrongPublicKey,
        ] ) );
    }

    /** @test */
    public function validate_bearer_jwt_returns_false_for_expired_token(): void {
        $token = JWT::encode(
            [ 'sub' => 'next-js', 'exp' => time() - 60 ],
            self::$rsaPrivateKeyPem,
            'RS256'
        );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        $this->assertFalse( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'RS256',
            'public_key' => self::$rsaPublicKeyPem,
        ] ) );
    }

    /** @test */
    public function validate_bearer_jwt_returns_false_when_public_key_is_missing(): void {
        $token = JWT::encode( [ 'sub' => 'next-js' ], self::$rsaPrivateKeyPem, 'RS256' );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        $this->assertFalse( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'RS256',
            'public_key' => '',
        ] ) );
    }

    /** @test */
    public function validate_bearer_jwt_returns_false_for_wrong_audience(): void {
        $token = JWT::encode(
            [ 'sub' => 'next-js', 'aud' => 'wrong-audience' ],
            self::$rsaPrivateKeyPem,
            'RS256'
        );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        $this->assertFalse( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'RS256',
            'public_key' => self::$rsaPublicKeyPem,
            'audience'   => 'expected-audience',
        ] ) );
    }

    /** @test */
    public function validate_bearer_jwt_returns_false_for_wrong_issuer(): void {
        $token = JWT::encode(
            [ 'sub' => 'next-js', 'iss' => 'wrong-issuer' ],
            self::$rsaPrivateKeyPem,
            'RS256'
        );
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";

        $this->assertFalse( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'RS256',
            'public_key' => self::$rsaPublicKeyPem,
            'issuer'     => 'expected-issuer',
        ] ) );
    }

    /** @test */
    public function validate_bearer_jwt_returns_false_when_no_bearer_header(): void {
        unset( $_SERVER['HTTP_AUTHORIZATION'] );

        $this->assertFalse( AuthJWT::validate_bearer_jwt( [
            'algorithm'  => 'RS256',
            'public_key' => self::$rsaPublicKeyPem,
        ] ) );
    }
}
