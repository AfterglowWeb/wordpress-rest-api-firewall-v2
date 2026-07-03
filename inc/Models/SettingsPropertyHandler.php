<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

use WP_REST_Settings_Controller;

class SettingsPropertyHandler {
    
    private ModelPropertyBuilder $propertyBuilder;
    private FilterManager $filterManager;
    private SampleDataFetcher $sampleDataFetcher;
    
    public function __construct(
        ModelPropertyBuilder $propertyBuilder,
        FilterManager $filterManager,
        SampleDataFetcher $sampleDataFetcher
    ) {
        $this->propertyBuilder = $propertyBuilder;
        $this->filterManager = $filterManager;
        $this->sampleDataFetcher = $sampleDataFetcher;
    }
    
    /**
     * Get settings route properties
     */
    public function getProperties(): array {
        $filters = $this->filterManager->getFilters();
        $stringAutoFilters = $this->filterManager->getStringAutoFilters($filters);
        
        // Try to get real data first
        $data = $this->sampleDataFetcher->fetchRestData('/wp/v2/settings');
        
        if (!empty($data)) {
            return $this->propertyBuilder->buildFromData($data, $filters);
        }
        
        // Fallback to schema
        $controller = new WP_REST_Settings_Controller();
        $schema = $controller->get_item_schema();
        
        if (empty($schema['properties'])) {
            return [];
        }
        
        $props = [];
        
        foreach ($schema['properties'] as $propertyKey => $property) {
            $propType = $property['type'] ?? '';
            $isString = $this->filterManager->isStringType($propType);
            
            $propertyFilters = $isString 
                ? $stringAutoFilters 
                : [];
            
            $props[$propertyKey] = array_merge(
                $property,
                [
                    'settings' => [
                        'disable' => false,
                        'filters' => $propertyFilters,
                    ],
                ]
            );
        }
        
        return $props;
    }
}