<?php namespace Bromate\RestApiFirewall\Security\Wordpress;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;

class RedirectTemplates {

	protected static $instance = null;

	public static function get_instance() {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	private function __construct() {
		add_action( 'template_redirect', array( $this, 'redirect_theme_templates' ) );
	}

	public static function redirect_preset_url_options() {
		return [
				['value' => 'front_page', 'label' => esc_html__('Front Page', 'bromate-rest-api-firewall')],
				['value' => 'blog_page', 'label' => esc_html__('Blog Page', 'bromate-rest-api-firewall')],
				['value' => 'login_page', 'label' => esc_html__('Login Page', 'bromate-rest-api-firewall')],
			];
	}


	public function redirect_theme_templates(): void {

		if ( is_admin() || wp_doing_ajax() ) {
			return;
		}

		global $wp;
		$current_url = sanitize_url( home_url( $wp->request ) );

		if( $this->is_upload_url( $current_url ) ) {
			return;
		}
		
		$theme_redirect_templates_enabled  = SettingsRepository::read_option( 'theme_redirect_templates_enabled' );
		
		if ( empty( $theme_redirect_templates_enabled ) ) {
			return;
		}

		$theme_redirect_templates_preset_url       = SettingsRepository::read_option( 'theme_redirect_templates_preset_url' );
		$theme_redirect_templates_free_url_enabled = SettingsRepository::read_option( 'theme_redirect_templates_free_url_enabled' );
		$theme_redirect_templates_free_url         = SettingsRepository::read_option( 'theme_redirect_templates_free_url' );
		$redirect_url = '';

		if( true === $theme_redirect_templates_free_url_enabled ) {
			$redirect_url = sanitize_url( apply_filters( 'rest_firewall_redirect_url', $theme_redirect_templates_free_url ) );
		} else {
			switch ( $theme_redirect_templates_preset_url ) {
				case 'wp_login':
					$redirect_url = wp_login_url();
					break;
				case 'front_page':
					if ( is_front_page()  ) {
						break;
					}
					
					$frontpage_id = get_option( 'page_on_front' );
					if( ! $frontpage_id ) {
						break;
					}

					$redirect_url = get_the_permalink( $frontpage_id );
				break;
				case 'blog_page':
					if ( is_home()  ) {
						break;
					}

					$blogpage_id = get_option( 'page_for_posts' );
					if( ! $blogpage_id ) {
						break;
					}

					$redirect_url = get_the_permalink( $blogpage_id );
				break;

			}
		}

		if( empty( $redirect_url ) ) {
			return;
		}

		wp_safe_redirect( apply_filters( 'allowed_redirect_hosts', $redirect_url ) );
		exit;
	}

	private function is_upload_url( string $url ): bool {

		$upload_dir = wp_get_upload_dir();

		if ( isset( $upload_dir['url'] ) && strpos( $url, $upload_dir['url'] ) !== false ) {
			return true;
		}

		return false;
	}
}
