<?php 
namespace Bromate\RestApiFirewall\Api;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Login\LoginRateLimiter;
use Bromate\RestApiFirewall\Security\Login\TOTPLoginService;

final class AdminLoginBootstrap {

	public static function register(): void {
		LoginRateLimiter::get_instance();
		TOTPLoginService::register();
	}

}