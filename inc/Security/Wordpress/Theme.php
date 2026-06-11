<?php namespace Bromate\RestApiFirewall\Security\Wordpress;
defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Utils\FileUtils;

class Theme {

	protected static $instance = null;

	public static function get_instance() {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	private function __construct() {
		add_action( 'after_setup_theme', array( $this, 'theme_supports' ) );
		add_action( 'after_setup_theme', array( $this, 'theme_menus' ) );
		add_action( 'after_setup_theme', array( $this, 'theme_lang' ) );
		add_filter( 'show_admin_bar', '__return_false' );

		if ( true === SettingsRepository::read_option( 'theme_remove_emoji_scripts' ) ) {
			add_action( 'init', array( $this, 'remove_emoji_scripts' ) );
		}

		if ( true === SettingsRepository::read_option( 'theme_json_acf_fields_enabled' )
			&& FileUtils::mkdir_p( get_stylesheet_directory() . '/config' ) ) {

			add_filter(
				'acf/settings/save_json',
				function () {
					return BROMATE_REST_API_FIREWALL_DIR . '/config';
				}
			);

			add_filter(
				'acf/settings/load_json',
				function () {
					return BROMATE_REST_API_FIREWALL_DIR . '/config';
				}
			);
		}

	}

	public function theme_supports(): void {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support(
			'html5',
			array(
				'search-form',
				'gallery',
				'caption',
			)
		);
		add_theme_support( 'menus' );
	}

	public function remove_emoji_scripts(): void {
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'wp_enqueue_scripts', 'wp_enqueue_emoji_styles' );
		remove_action( 'enqueue_embed_scripts', 'wp_enqueue_emoji_styles' );

		remove_action( 'wp_head', 'print_emoji_detection_script', 20 );
		remove_action( 'embed_head', 'print_emoji_detection_script', 20 );

		remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
		remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
		remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );

		if ( is_admin() ) {
			remove_action( 'admin_print_styles', 'print_emoji_styles' );
			remove_action( 'admin_enqueue_scripts', 'wp_enqueue_emoji_styles', 20 );
			remove_action( 'admin_print_scripts', 'print_emoji_detection_script', 20 );
			remove_action( 'admin_print_scripts', 'print_emoji_detection_script', 20 );
		}

	}

	public function theme_menus(): void {
		$json_file = get_stylesheet_directory() . '/config/menus.json';
		$json_content = FileUtils::read_file( $json_file );

		if ( ! $json_content ) {
			return;
		}

		$menus = json_decode( $json_content, true );

		if ( ! isset( $menus['menus'] ) || ! is_array( $menus['menus'] ) ) {
			return;
		}

		$formatted_menus = array();

		foreach ( $menus['menus'] as $menu ) {
			if ( isset( $menu['slug'], $menu['name'] ) ) {
				$formatted_menus[ sanitize_key( $menu['slug'] ) ] = sanitize_text_field( $menu['name'] );
			}
		}

		if ( ! empty( $formatted_menus ) ) {
			register_nav_menus( $formatted_menus );
		}
	}

	public function theme_lang(): void {
		$handle = false;

		if ( defined( 'WP_LANG_DIR' ) ) {
			$handle = load_theme_textdomain( 'bromate-rest-api-firewall' );
		}

		if ( false === $handle ) {
			load_theme_textdomain( 'bromate-rest-api-firewall', get_stylesheet_directory() . '/languages' );
		}
	}
}
