<?php namespace Bromate\RestApiFirewall\Api\Routing;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Logs\FirewallLogger;
use WP_User;

final class AdminLoginBootstrap {

	public static function register(): void {
		add_action( 'wp_login', array( self::class, 'on_login_success' ), 10, 2 );
		add_action( 'wp_login_failed', array( self::class, 'on_login_failed' ), 10, 1 );
	}

	public static function on_login_success( string $user_login, WP_User $user ): void {
		FirewallLogger::admin_login_success( $user->ID );
	}

	public static function on_login_failed( string $username ): void {
		FirewallLogger::admin_login_failed( $username );
	}
}
