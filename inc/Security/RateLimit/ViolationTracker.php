<?php namespace Bromate\RestApiFirewall\Security\RateLimit;

defined( 'ABSPATH' ) || exit;

class ViolationTracker {

    private const VIOLATIONS_KEY_PREFIX ='rest_firewall_violations_';

    public static function record_violation(
        string $client_id,
        int $window
    ): int {

        $key = self::VIOLATIONS_KEY_PREFIX . md5( $client_id );

        $count = (int) get_transient( $key );

        ++$count;

        set_transient(
            $key,
            $count,
            $window
        );

        return $count;
    }

    public static function clear_violations(
        string $client_id
    ): void {

        delete_transient(
            self::VIOLATIONS_KEY_PREFIX . md5( $client_id )
        );
    }
}