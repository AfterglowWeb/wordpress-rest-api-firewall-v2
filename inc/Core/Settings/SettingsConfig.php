<?php namespace Bromate\RestApiFirewall\Core\Settings;

use Bromate\RestApiFirewall\Security\Ip\CidrMatcher;
use Bromate\RestApiFirewall\Security\Ip\GeoIpApi;

final class SettingsConfig {

	private function __construct() {}

	public static function register(): void {
		$self = new self();
		add_action( 'admin_init', array( $self, 'register_settings' ) );
	}

	public function register_settings(): void {
		register_setting(
			'bromate_rest_api_firewall_options_group',
			'bromate_rest_api_firewall_options',
			array(
				'sanitize_callback' => array( self::class, 'sanitize_options' ),
				'default'           => self::default_options(),
			)
		);
	}

	public static function options_config(): array {

		$options = array(
			'auth_enforce'                            => array(
				'label'             => esc_html__( 'Require authentication for all API routes', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'When enabled, all REST API routes require authentication unless explicitly allowed by route policies.', 'bromate-rest-api-firewall' ),
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'authentication',
			),

			'auth_methods'                            => array(
				'label'             => esc_html__( 'Authentication method', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Choose how API clients authenticate with the REST API.', 'bromate-rest-api-firewall' ),
				'default_value'     => 'wp_auth',
				'ui'                => 'select',
				'choices'           => array(
					'wp_auth' => esc_html__( 'WordPress Auth', 'bromate-rest-api-firewall' ),
					'jwt'     => esc_html__( 'JWT', 'bromate-rest-api-firewall' ),
				),
				'type'              => 'string',
				'sanitize_callback' => static fn( $v ) => in_array( $v, array( 'wp_auth', 'jwt' ), true ) ? $v : 'wp_auth',
				'group'             => 'authentication',
			),

			'auth_jwt_algorithm'                      => array(
				'label'             => esc_html__( 'JWT algorithm', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Cryptographic algorithm used to verify JWT tokens.', 'bromate-rest-api-firewall' ),
				'default_value'     => 'RS256',
				'ui'                => 'select',
				'choices'           => array(
					'HS256',
					'HS384',
					'HS512',
					'RS256',
					'RS384',
					'RS512',
					'ES256',
				),
				'type'              => 'string',
				'sanitize_callback' => static fn( $v ) => in_array( $v, array( 'HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256' ), true ) ? $v : 'RS256',
				'group'             => 'authentication',
			),

			'auth_jwt_public_key'                     => array(
				'label'             => esc_html__( 'JWT public key', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Public key used to validate signed JWT tokens.', 'bromate-rest-api-firewall' ),
				'default_value'     => '',
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
				'group'             => 'authentication',
			),

			'auth_jwt_audience'                       => array(
				'label'             => esc_html__( 'JWT audience', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Expected audience claim for incoming JWT tokens.', 'bromate-rest-api-firewall' ),
				'default_value'     => '',
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'group'             => 'authentication',
			),

			'auth_jwt_issuer'                         => array(
				'label'             => esc_html__( 'JWT issuer', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Expected issuer claim for incoming JWT tokens.', 'bromate-rest-api-firewall' ),
				'default_value'     => '',
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'group'             => 'authentication',
			),

			'auth_user_ids'                           => array(
				'label'             => esc_html__( 'Authorized API users', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Restrict API access to specific WordPress user accounts.', 'bromate-rest-api-firewall' ),
				'default_value'     => 0,
				'type'              => 'integer',
				'sanitize_callback' => 'sanitize_array_int',
				'group'             => 'authentication',
			),

			'rate_limit_enabled'                      => array(
				'label'             => esc_html__( 'Enable API rate limiting', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Protect the API against excessive requests and abuse.', 'bromate-rest-api-firewall' ),
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'rate-limiting',
			),

			'rate_limit_max'                          => array(
				'label'             => esc_html__( 'Maximum requests', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Number of requests allowed during the configured time window.', 'bromate-rest-api-firewall' ),
				'default_value'     => 30,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'rate-limiting',
			),

			'rate_limit_time'                         => array(
				'label'             => esc_html__( 'Time window (seconds)', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Period used to count requests before the limit resets.', 'bromate-rest-api-firewall' ),
				'default_value'     => 60,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'rate-limiting',
			),

			'rate_limit_block_duration'               => array(
				'label'             => esc_html__( 'Temporary block duration (seconds)', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'How long a client remains blocked after exceeding the rate limit.', 'bromate-rest-api-firewall' ),
				'default_value'     => 300,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'rate-limiting',
			),

			'rate_limit_blacklist_threshold'          => array(
				'label'             => esc_html__( 'Blacklist threshold', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Number of rate-limit violations before automatic blacklisting.', 'bromate-rest-api-firewall' ),
				'default_value'     => 5,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'rate-limiting',
			),

			'rate_limit_whitelist'                    => array(
				'label'             => esc_html__( 'Rate limit whitelist', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'IP addresses or CIDR ranges exempt from rate limiting.', 'bromate-rest-api-firewall' ),
				'default_value'     => array(),
				'type'              => 'array',
				'sanitize_callback' => array( CidrMatcher::class, 'sanitize_ip_array' ),
				'group'             => 'rate-limiting',
			),

			'rate_limit_countries'                    => array(
				'label'             => esc_html__(
					'Blocked countries',
					'bromate-rest-api-firewall'
				),
				'info'              => esc_html__(
					'Requests originating from these countries will be denied access to the REST API.',
					'bromate-rest-api-firewall'
				),
				'default_value'     => array(),
				'type'              => 'array',
				'sanitize_callback' => array( GeoIpApi::class, 'sanitize_country_codes' ),
				'group'             => 'rate-limiting',
			),

			'rate_limit_emergency_token_hash'         => array(
				'label'             => esc_html__( 'Emergency bypass token', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Hashed token allowing emergency access when clients are rate limited.', 'bromate-rest-api-firewall' ),
				'default_value'     => '',
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'group'             => 'rate-limiting',
			),

			// Routes Policies.
			'routes_policy_enabled'                   => array(
				'label'             => esc_html__( 'Enable route policies', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Control route visibility and authentication requirements on a per-route basis.', 'bromate-rest-api-firewall' ),
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'routes_policy',
			),

			'routes_policy_rules'                     => array(
				'label'             => esc_html__( 'Per-route policies', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Custom visibility and authentication rules applied to individual routes.', 'bromate-rest-api-firewall' ),
				'default_value'     => array(
					'nodes'  => array(),
					'routes' => array(),
				),
				'type'              => 'array',
				'sanitize_callback' => '',
				'group'             => 'routes_policy',
			),

			'routes_policy_hidden_routes'             => array(
				'label'             => esc_html__( 'Hidden routes', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Routes removed from discovery and unavailable to public clients.', 'bromate-rest-api-firewall' ),
				'default_value'     => false,
				'type'              => 'array',
				'options'           => array(
					'users',
					'oembed',
					'batch',
				),
				'sanitize_callback' => '',
				'group'             => 'routes_policy',
			),

			'routes_policy_hidden_response_code'      => array(
				'label'             => esc_html__( 'Hidden ressources response code', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'HTTP response code on hidden ressources.', 'bromate-rest-api-firewall' ),
				'default_value'     => '404',
				'options'           => array(
					'401',
					'403',
					'404',
				),
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'group'             => 'routes_policy',
			),

			// Auth hardening.
			'login_rate_limit_enabled'                => array(
				'label'             => esc_html__( 'Protect login page', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Limit failed login attempts to reduce brute-force attacks.', 'bromate-rest-api-firewall' ),
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'login-hardening',
			),

			'login_rate_limit_attempts'               => array(
				'label'             => esc_html__( 'Maximum login attempts', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Number of failed login attempts allowed before blocking the client.', 'bromate-rest-api-firewall' ),
				'default_value'     => 5,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'login-hardening',
			),

			'login_rate_limit_window'                 => array(
				'label'             => esc_html__( 'Login attempt window (seconds)', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Time period used to count failed login attempts.', 'bromate-rest-api-firewall' ),
				'default_value'     => 300,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'login-hardening',
			),

			'login_rate_limit_blacklist_time'         => array(
				'label'             => esc_html__( 'Login block duration (seconds)', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'How long an IP remains blocked after exceeding login limits.', 'bromate-rest-api-firewall' ),
				'default_value'     => 3600,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'login-hardening',
			),

			'login_rate_limit_promote_after'          => array(
				'label'             => esc_html__( 'Permanent blacklist threshold', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Number of temporary blocks before promoting an IP to the blacklist.', 'bromate-rest-api-firewall' ),
				'default_value'     => 0,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'login-hardening',
			),

			// API Models response
			'models_enabled'                          => array(
				'label'             => esc_html__( 'Transform REST API responses', 'bromate-rest-api-firewall' ),
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_relative_urls'                    => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_relative_uploads_urls'            => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_remove_links_prop'                => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_remove_embed_prop'                => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_remove_empty_props'               => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_remove_empty_props_recursively'   => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_resolve_rendered_props'           => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_embed_featured_attachment'        => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_embed_attachments'                => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_embed_terms'                      => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_embed_author'                     => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'models',
			),

			'models_date_format'                      => array(
				'default_value'     => 'wordpress',
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'group'             => 'models',
			),

			'wordpress_application_only_mode'         => array(
				'label'             => esc_html__( 'Application-only mode', 'bromate-rest-api-firewall' ),
				'info'              => esc_html__( 'Redirect front-end pages and use WordPress primarily as a REST API backend.', 'bromate-rest-api-firewall' ),
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress_mode',
			),

			'wordpress_redirect_templates_preset_url' => array(
				'default_value'     => '',
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'group'             => 'wordpress',
			),

			'wordpress_redirect_templates_user_url'   => array(
				'default_value'     => '',
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_url',
				'group'             => 'wordpress',
			),

			'wordpress_disable_xmlrpc'                => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_disable_comments'              => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_disable_pingbacks'             => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_disable_rss'                   => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_disable_sitemap'               => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_enforce_wpconfig_permissions'  => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_secure_uploads_dir'            => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_secure_http_headers'           => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_compression_http_headers'      => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_wp_http_headers'               => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_remove_emoji_scripts'          => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_svg_webp_support_enabled'      => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_max_upload_weight'             => array(
				'default_value'     => 1024, // KB.
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'group'             => 'wordpress',
			),

			'wordpress_max_upload_weight_enabled'     => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

			'wordpress_json_acf_fields_enabled'       => array(
				'default_value'     => false,
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'group'             => 'wordpress',
			),

		);

		return apply_filters( 'bromate_rest_application_layer_core_options', $options );
	}

	public static function groups_config(): array {
		return array(

			'dashboard' => array(
				'label' => __( 'Dashboard', 'bromate-rest-api-firewall' ),
				'icon'  => 'dashboard',
			),

			'authentication'          => array(
				'label' => __( 'Authentication', 'bromate-rest-api-firewall' ),
				'icon'  => 'lock',
			),

			'rate-limiting'          => array(
				'label' => __( 'Rate Limiting', 'bromate-rest-api-firewall' ),
				'icon'  => 'speed',
			),

			'access-control'          => array(
				'label' => __( 'Access Control', 'bromate-rest-api-firewall' ),
				'icon'  => 'world',
			),

			'routes_policy' => array(
				'label' => __( 'Route Policies', 'bromate-rest-api-firewall' ),
				'icon'  => 'route',
			),

			'models'        => array(
				'label' => __( 'Response Models', 'bromate-rest-api-firewall' ),
				'icon'  => 'data_object',
			),

			'login-hardening'         => array(
				'label' => __( 'Login Protection', 'bromate-rest-api-firewall' ),
				'icon'  => 'shield',
			),

			'wordpress'     => array(
				'label' => __( 'WordPress Hardening', 'bromate-rest-api-firewall' ),
				'icon'  => 'wordpress',
			),

		);
	}

	public static function default_options(): array {
		$defaults = array();

		foreach ( self::options_config() as $key => $config ) {
			$defaults[ $key ] = $config['default_value'];
		}

		return $defaults;
	}

	public static function to_json(): string {
		return wp_json_encode( self::register(), JSON_PRETTY_PRINT );
	}
}
