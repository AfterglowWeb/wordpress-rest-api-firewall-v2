<?php namespace Bromate\RestApiFirewall\Security\WordPress;

use Bromate\RestApiFirewall\Core\Settings\SettingsRepository;
use Bromate\RestApiFirewall\Core\FileUtils;
use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;

defined( 'ABSPATH' ) || exit;

class FilePermissions {
	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		add_action( 'wp_ajax_update_file_permissions', array( $this, 'ajax_update_file_permissions' ) );
		add_action( 'wp_ajax_protect_uploads_dir', array( $this, 'ajax_protect_uploads_dir' ) );
		add_action( 'wp_ajax_get_file_status', array( $this, 'ajax_get_file_status' ) );

		if ( SettingsRepository::read_option( 'theme_enforce_wpconfig_permissions' ) ) {
			$permissions = $this->read_wp_config_permissions();
			if ( $permissions && '440' !== $permissions ) {
				$this->change_wp_config_permissions();
			}
		}
	}

	public function ajax_update_file_permissions(): void {
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized', 'bromate-rest-api-firewall' ) ), 403 );
		}

		$permissions = $this->read_wp_config_permissions();

		if ( ! $permissions ) {
			wp_send_json_error( array( 'message' => esc_html__( 'wp-config.php is not readable.', 'bromate-rest-api-firewall' ) ), 500 );
			return;
		}

		if ( '440' === $permissions ) {
			wp_send_json_success( array( 'message' => esc_html__( 'wp-config.php permissions are already secure (440).', 'bromate-rest-api-firewall' ) ) );
			return;
		}

		if ( $this->change_wp_config_permissions() ) {
			wp_send_json_success( array( 'message' => esc_html__( 'wp-config.php permissions set to 440 successfully.', 'bromate-rest-api-firewall' ) ) );
		} else {
			wp_send_json_error( array( 'message' => esc_html__( 'Failed to update wp-config.php permissions. Check that the web server user owns the file.', 'bromate-rest-api-firewall' ) ), 500 );
		}
	}

	private function read_wp_config_permissions() {
		FileUtils::wp_filesystem();
		$perms = FileUtils::get_file_permissions( ABSPATH . 'wp-config.php' );
		return false === $perms ? false : ltrim( $perms, '0' );
	}

	private function change_wp_config_permissions(): bool {
		FileUtils::wp_filesystem();
		if ( ! FileUtils::is_readable( ABSPATH . 'wp-config.php' ) ) {
			return false;
		}

		$success = FileUtils::change_file_permissions( ABSPATH . 'wp-config.php', 0440 );

		if ( $success ) {
			SettingsRepository::update_option( 'theme_enforce_wpconfig_permissions', true );
		}
		return $success;
	}

	public function ajax_get_file_status(): void {
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized', 'bromate-rest-api-firewall' ) ), 403 );
		}

		$wpconfig_perms  = $this->read_wp_config_permissions();
		$wpconfig_secure = ( '440' === $wpconfig_perms || '400' === $wpconfig_perms );

		$upload_dir        = wp_upload_dir();
		$htaccess_path     = trailingslashit( $upload_dir['basedir'] ) . '.htaccess';
		$htaccess_content  = (string) FileUtils::read_file( $htaccess_path );
		$uploads_protected = false !== strpos( $htaccess_content, '# REST API Firewall' );

		wp_send_json_success(
			array(
				'wpconfig_secure'   => $wpconfig_secure,
				'wpconfig_perms'    => $wpconfig_perms ? $wpconfig_perms : null,
				'uploads_protected' => $uploads_protected,
				'nginx_snippet'     => $this->get_uploads_nginx_snippet( $upload_dir['baseurl'] ),
			)
		);
	}

	public function ajax_protect_uploads_dir(): void {
		if ( false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized', 'bromate-rest-api-firewall' ) ), 403 );
		}

		$upload_dir   = wp_upload_dir();
		$uploads_path = trailingslashit( $upload_dir['basedir'] );

		if ( ! FileUtils::is_dir( $uploads_path ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Uploads directory not found.', 'bromate-rest-api-firewall' ) ), 500 );
			return;
		}

		$results = array();
		$errors  = array();

		// Apache.
		$htaccess_path     = $uploads_path . '.htaccess';
		$htaccess_content  = $this->get_uploads_htaccess();
		$htaccess_existing = FileUtils::read_file( $htaccess_path );

		if ( false !== strpos( (string) $htaccess_existing, '# REST API Firewall' ) ) {
			$results[] = esc_html__( 'Apache: .htaccess rules already present.', 'bromate-rest-api-firewall' );
		} elseif ( FileUtils::write_file( $htaccess_path, $htaccess_content ) ) {
			$results[] = esc_html__( 'Apache: .htaccess created successfully.', 'bromate-rest-api-firewall' );
		} else {
			$errors[] = esc_html__( 'Apache: could not write .htaccess — check directory permissions.', 'bromate-rest-api-firewall' );
		}

		// IIS.
		$webconfig_path     = $uploads_path . 'web.config';
		$webconfig_content  = $this->get_uploads_webconfig();
		$webconfig_existing = FileUtils::read_file( $webconfig_path );

		if ( false !== strpos( (string) $webconfig_existing, 'REST API Firewall' ) ) {
			$results[] = esc_html__( 'IIS: web.config rules already present.', 'bromate-rest-api-firewall' );
		} elseif ( FileUtils::write_file( $webconfig_path, $webconfig_content ) ) {
			$results[] = esc_html__( 'IIS: web.config created successfully.', 'bromate-rest-api-firewall' );
		} else {
			$results[] = esc_html__( 'IIS: web.config could not be written (non-fatal if not running IIS).', 'bromate-rest-api-firewall' );
		}

		$results[] = esc_html__( 'Nginx: .htaccess files are ignored by Nginx. Add the following block to your server configuration:', 'bromate-rest-api-firewall' );

		if ( ! empty( $errors ) ) {
			wp_send_json_error(
				array(
					'message' => implode( "\n", array_merge( $errors, $results ) ),
				),
				500
			);
			return;
		}

		SettingsRepository::update_option( 'theme_secure_uploads_dir', true );

		wp_send_json_success( array( 'message' => implode( "\n", $results ) ) );
	}

	private function get_uploads_htaccess(): string {
		return <<<'HTACCESS'
# REST API Firewall — uploads directory protection
# Deny execution of PHP and other server-side scripts.
<FilesMatch "\.(php[0-9]?|phtml|phar|pl|py|cgi|sh|rb|asp|aspx|jsp)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Deny from all
    </IfModule>
</FilesMatch>

# Disable directory listing.
Options -Indexes
HTACCESS;
	}

	private function get_uploads_webconfig(): string {
		return <<<'WEBCONFIG'
<?xml version="1.0" encoding="UTF-8"?>
<!-- REST API Firewall — uploads directory protection -->
<configuration>
  <system.webServer>
    <directoryBrowse enabled="false" />
    <security>
      <requestFiltering>
        <fileExtensions>
          <add fileExtension=".php"   allowed="false" />
          <add fileExtension=".phtml" allowed="false" />
          <add fileExtension=".phar"  allowed="false" />
          <add fileExtension=".asp"   allowed="false" />
          <add fileExtension=".aspx"  allowed="false" />
          <add fileExtension=".jsp"   allowed="false" />
        </fileExtensions>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
WEBCONFIG;
	}

	private function get_uploads_nginx_snippet( string $uploads_url ): string {
		$uploads_path_rel = wp_parse_url( $uploads_url, PHP_URL_PATH );
		return sprintf(
			"location ~* ^%s/.*\.(php[0-9]?|phtml|phar|pl|py|cgi|sh)$ {\n    deny all;\n}\nlocation ^~ %s/ {\n    autoindex off;\n}",
			rtrim( $uploads_path_rel, '/' ),
			rtrim( $uploads_path_rel, '/' )
		);
	}
}
