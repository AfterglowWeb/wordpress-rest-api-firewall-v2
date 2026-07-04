<?php namespace Bromate\RestApiFirewall\Security\WordPress;

defined( 'ABSPATH' ) || exit;

use Bromate\RestApiFirewall\Security\WordPress\DisableAPIs;
use Bromate\RestApiFirewall\Security\WordPress\DisableComments;
use Bromate\RestApiFirewall\Security\WordPress\DisableEmbeds;
use Bromate\RestApiFirewall\Security\WordPress\DisableEmojiScripts;
use Bromate\RestApiFirewall\Security\WordPress\FilePermissions;
use Bromate\RestApiFirewall\Security\WordPress\HttpHeaders;
use Bromate\RestApiFirewall\Security\WordPress\RedirectTemplates;

class WordPressSecurityBootstrap {

	protected static $instance = null;

	public static function register() {
		if ( null === static::$instance ) {
			static::$instance = new static();
		}
		return static::$instance;
	}

	private function __construct() {
		DisableAPIs::register();
		DisableComments::register();
		DisableEmbeds::register();
		DisableEmojiScripts::register();
		FilePermissions::register();
		HttpHeaders::register();
		RedirectTemplates::register();
	}
}
