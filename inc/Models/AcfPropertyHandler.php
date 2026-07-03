<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

class AcfPropertyHandler {
    
    private FilterManager $filterManager;
    private array $acfStringTypes = ['text', 'textarea', 'wysiwyg', 'oembed', 'url', 'email', 'password', 'link'];
    
    public function __construct(FilterManager $filterManager) {
        $this->filterManager = $filterManager;
    }
    
    /**
     * Enhance properties with ACF fields
     */
    public function enhanceWithAcfFields(
        array $props,
        string $postType,
        array $stringAutoFilters
    ): array {
        if (!isset($props['acf']) || !function_exists('acf_get_field_groups')) {
            return $props;
        }
        
        $fieldGroups = acf_get_field_groups(['post_type' => $postType]);
        $allFields = [];
        
        foreach ($fieldGroups as $group) {
            if (!isset($group['key'])) {
                continue;
            }
            
            $fields = acf_get_fields($group['key']) ?: [];
            foreach ($fields as $field) {
                $allFields[] = $field;
            }
        }
        
        if (!empty($allFields)) {
            $props['acf']['properties'] = $this->buildAcfSubprops($allFields, $stringAutoFilters);
        }
        
        return $props;
    }
    
    /**
     * Build ACF sub-properties
     */
    public function buildAcfSubprops(
        array $fields,
        array $stringFilters = []
    ): array {
        $props = [];
        
        foreach ($fields as $field) {
            if (!isset($field['name'], $field['type'])) {
                continue;
            }
            
            $key = sanitize_key($field['name']);
            $acfType = $field['type'];
            $isStringType = in_array($acfType, $this->acfStringTypes, true);
            
            $fieldData = [
                'type' => sanitize_text_field($acfType),
                'description' => sanitize_text_field($field['label'] ?? ''),
                'settings' => [
                    'disable' => false,
                    'filters' => $isStringType ? $stringFilters : [],
                ],
            ];
            
            // Handle sub fields
            if (!empty($field['sub_fields']) && is_array($field['sub_fields'])) {
                $fieldData['properties'] = $this->buildAcfSubprops(
                    $field['sub_fields'],
                    $stringFilters
                );
            }
            
            // Handle flexible content layouts
            if ('flexible_content' === $acfType && 
                !empty($field['layouts']) && 
                is_array($field['layouts'])) {
                $fieldData['properties'] = $this->buildLayoutProps(
                    $field['layouts'],
                    $stringFilters
                );
            }
            
            $props[$key] = $fieldData;
        }
        
        return $props;
    }
    
    /**
     * Build layout properties for flexible content
     */
    private function buildLayoutProps(array $layouts, array $stringFilters): array {
        $layoutProps = [];
        
        foreach ($layouts as $layout) {
            $layoutKey = sanitize_key($layout['name'] ?? '');
            
            if ('' === $layoutKey) {
                continue;
            }
            
            $layoutProps[$layoutKey] = [
                'type' => 'object',
                'description' => sanitize_text_field($layout['label'] ?? ''),
                'settings' => [
                    'disable' => false,
                    'filters' => [],
                ],
                'properties' => $this->buildAcfSubprops(
                    $layout['sub_fields'] ?? [],
                    $stringFilters
                ),
            ];
        }
        
        return $layoutProps;
    }
}