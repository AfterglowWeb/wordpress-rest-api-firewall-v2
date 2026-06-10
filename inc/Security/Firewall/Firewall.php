<?php namespace Bromate\RestApiFirewall\Security\Firewall;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;

class Firewall
{
    /** @var FirewallRule[] */
    private array $rules;

    public function inspect(WP_REST_Request $request)
    {
        foreach ($this->rules as $rule) {
            $result = $rule->check($request);

            if (is_wp_error($result)) {
                return $result;
            }
        }

        return true;
    }
}

interface FirewallRule
{
    public function check(WP_REST_Request $request);
}
