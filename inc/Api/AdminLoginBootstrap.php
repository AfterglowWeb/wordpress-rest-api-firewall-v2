<?php
namespace Bromate\RestApiFirewall\Api;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Login\LoginRateLimiter;
use Bromate\RestApiFirewall\Security\Login\TOTPLoginService;
use Bromate\RestApiFirewall\Security\Login\TOTPController;
use Bromate\RestApiFirewall\Security\Login\Recaptcha;


final class AdminLoginBootstrap {

    public static function register(): void {
        LoginRateLimiter::get_instance();
        Recaptcha::get_instance();
        TOTPLoginService::register();
        
        if ( is_admin() ) {
            TOTPController::register();
        }

    }

}