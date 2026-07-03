<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

class SecurityManager {
    
    /**
     * Apply security flags to author properties
     */
    public function applyAuthorSecurityFlags(array $props): array {
        $lockedKeys = [
            'username', 'email', 'capabilities', 'extra_capabilities',
            'admin_url', 'roles', 'jwt_claim_sub', 'status', 'expires_at'
        ];
        
        foreach ($lockedKeys as $key) {
            if (isset($props[$key])) {
                $props[$key]['settings']['disable'] = true;
                $props[$key]['settings']['locked'] = true;
                $props[$key]['settings']['filters'] = [];
            }
        }
        
        $disabledKeys = ['registered_date', 'roles', 'locale'];
        
        foreach ($disabledKeys as $key) {
            if (isset($props[$key])) {
                $props[$key]['settings']['disable'] = true;
            }
        }
        
        return $props;
    }
}