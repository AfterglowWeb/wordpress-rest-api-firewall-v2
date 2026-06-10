<?php namespace Bromate\RestApiFirewall\Admin;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Admin\AdminPage;
use Bromate\RestApiFirewall\Admin\Documentation;

final class AdminBootstrap {


	public static function register(): void {
		AdminPage::register();
		Documentation::register();
	}

	private function __construct() {}
}