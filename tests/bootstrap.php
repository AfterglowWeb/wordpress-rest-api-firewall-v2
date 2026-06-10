<?php

/**
 * PHPUnit bootstrap — stubs WordPress constants so the AuthJWT class can be
 * loaded without a full WordPress installation.
 *
 * WordPress *functions* (sanitize_text_field, wp_unslash) are stubbed per-test
 * via Brain\Monkey in AuthJWTTest::setUp() — they must NOT be defined here,
 * because Patchwork is loaded by the autoloader and needs to intercept them
 * before any plain `function foo()` definition lands.
 */

require_once __DIR__ . '/../vendor/autoload.php';

// WP constant required by the plugin guard ( defined('ABSPATH') || exit ).
if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/../' );
}
