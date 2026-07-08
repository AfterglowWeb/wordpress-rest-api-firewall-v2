<?php
namespace Bromate\RestApiFirewall\Api;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Login\LoginRateLimiter;
use Bromate\RestApiFirewall\Security\Login\TOTPLoginService;
use Bromate\RestApiFirewall\Security\Login\TOTPController;
use Bromate\RestApiFirewall\Security\Login\Recaptcha;
use Bromate\RestApiFirewall\Security\Login\SameSiteCookies;
use Bromate\RestApiFirewall\Security\Login\SessionManager;
use Bromate\RestApiFirewall\Security\Login\SaltRotation;


final class LoginBootstrap {

    public static function register(): void {

        LoginRateLimiter::get_instance();
        Recaptcha::get_instance();
        TOTPLoginService::register();
        SaltRotation::register();
        SameSiteCookies::register();
        SessionManager::register();

        if ( is_admin() ) {
            TOTPController::register();
        }
    }


}