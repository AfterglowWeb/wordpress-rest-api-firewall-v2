<?php namespace Bromate\RestApiFirewall\Core\Settings;

class SettingsRepository {

	private function __construct() {}

	public static function read_options(): array {
		return self::sanitize_options( get_option( 'rest_api_firewall_options', array() ) );
	}

	public static function read_option( string $option_key ) {
		$option_key = sanitize_key( $option_key );
		$options    = self::sanitize_options( get_option( 'rest_api_firewall_options', array() ) );
		return isset( $options[ $option_key ] ) ? $options[ $option_key ] : false;
	}

	public static function update_options( array $new_options ): array {

		$old_options       = self::read_options();
		$sanitized_options = self::sanitize_options( $new_options, false );

		update_option( 'rest_api_firewall_options', $sanitized_options );

		do_action( 'rest_firewall_admin_options_updated', $sanitized_options, $old_options );

		return $sanitized_options;
	}

	public static function update_option( string $option_key, $new_option ) {

		$options_config = SettingsConfig::options_config();
		if ( ! isset( $options_config[ $option_key ] ) ) {
			return false;
		}

		$old_option = self::read_option( $option_key );

		$sanitized_option       = self::sanitize_option( $option_key, $new_option );
		$options                = self::read_options();
		$options[ $option_key ] = $sanitized_option;

		update_option( 'rest_api_firewall_options', $options );

		do_action( 'rest_firewall_admin_option_updated', $option_key, $sanitized_option, $old_option );

		return $sanitized_option;
	}

	public static function sanitize_options( array $options, bool $use_defaults = true ): array {
		$options_config = SettingsConfig::options_config();
		$base_values    = $use_defaults ? SettingsConfig::default_options() : get_option( 'rest_api_firewall_options', SettingsConfig::default_options() );

		$options   = wp_parse_args( $options, $base_values );
		$sanitized = array();

		foreach ( $options_config as $option_key => $config ) {
			$sanitized_key = sanitize_key( $option_key );
			$value         = $options[ $option_key ];

			$sanitized[ $sanitized_key ] = self::sanitize_option( $option_key, $value );
		}

		return $sanitized;
	}

	public static function sanitize_option( string $option_key, $option_value ) {
		$options_config = SettingsConfig::options_config();

		if ( ! isset( $options_config[ $option_key ] ) ) {
			return null;
		}

		$config   = $options_config[ $option_key ];
		$callback = $config['sanitize_callback'] ?? null;
		$type     = $config['type'] ?? 'string';

		if ( ! is_callable( $callback ) ) {
			return $config['default_value'] ? $config['default_value'] : null;
		}

		switch ( $type ) {
			case 'boolean':
				return (bool) call_user_func( $callback, $option_value );

			case 'integer':
				return (int) call_user_func( $callback, $option_value );

			case 'array':
				return is_array( $option_value )
					? array_map( $callback, $option_value )
					: array();

			case 'string':
			default:
				return (string) call_user_func( $callback, $option_value );
		}
	}
}
