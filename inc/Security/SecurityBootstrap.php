<?php namespace Bromate\RestApiFirewall\Security;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\Firewall\FirewallBootstrap;
use Bromate\RestApiFirewall\Security\Firewall\IpBlacklist\IpBlacklistAjaxController;

class SecurityBootstrap
{
    public static function register(): void
    {
        FirewallBootstrap::register();
        IpBlacklistAjaxController::register();
    }
}