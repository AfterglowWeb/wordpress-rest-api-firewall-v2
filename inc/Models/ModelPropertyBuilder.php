<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

class ModelPropertyBuilder {
    
    private const MAX_DEPTH = 5;
    private FilterManager $filterManager;
    
    public function __construct(FilterManager $filterManager) {
        $this->filterManager = $filterManager;
    }
    
    /**
     * Build properties from schema
     */
    public function buildFromSchema(
        array $schemaProperties,
        array $filters,
        array $stringAutoFilters
    ): array {
        $props = [];
        
        foreach ($schemaProperties as $propertyKey => $property) {
            $propertyFilters = $this->filterManager->getFiltersPerProperty($propertyKey, $filters);
            $propType = $property['type'] ?? '';
            $isString = $this->filterManager->isStringType($propType);
            
            // Apply string filters only to string properties
            if (!$isString) {
                $propertyFilters = $this->filterManager->removeSearchReplaceFilter($propertyFilters);
            } elseif ($isString) {
                $propertyFilters = $this->filterManager->addMissingStringFilters(
                    $propertyFilters,
                    $stringAutoFilters
                );
            }
            
            // Auto-detect rendered filter
            if (isset($property['properties']['rendered'])) {
                $this->filterManager->maybeAddRenderedFilter($propertyFilters, $filters);
            }
            
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
    
    /**
     * Build properties from data
     */
    public function buildFromData(
        array $data,
        array $filters = [],
        int $depth = 0
    ): array {
        if ($depth > self::MAX_DEPTH) {
            return [];
        }
        
        $props = [];
        $stringAutoFilters = $this->filterManager->getStringAutoFilters($filters);
        
        foreach ($data as $key => $value) {
            $strKey = (string) $key;
            $type = $this->inferJsonType($value);
            $propertyFilters = $this->filterManager->getFiltersPerProperty($strKey, $filters);
            
            // Apply filters based on type
            if ('string' !== $type) {
                $propertyFilters = $this->filterManager->removeSearchReplaceFilter($propertyFilters);
            } elseif ('string' === $type) {
                $propertyFilters = $this->filterManager->addMissingStringFilters(
                    $propertyFilters,
                    $stringAutoFilters
                );
            }
            
            // Auto-detect rendered filter
            if ('object' === $type && 
                is_array($value) && 
                array_key_exists('rendered', $value)) {
                $this->filterManager->maybeAddRenderedFilter($propertyFilters, $filters);
            }
            
            $prop = [
                'type' => $type,
                'settings' => [
                    'disable' => false,
                    'filters' => $propertyFilters,
                ],
            ];
            
            // Handle nested structures
            if ($depth < self::MAX_DEPTH) {
                if ('object' === $type) {
                    $sub = $this->buildFromData((array) $value, $filters, $depth + 1);
                    if (!empty($sub)) {
                        $prop['properties'] = $sub;
                    }
                } elseif ('array' === $type && 
                    is_array($value) && 
                    !empty($value)) {
                    $first = reset($value);
                    if (is_array($first) && !empty($first)) {
                        $sub = $this->buildFromData($first, $filters, $depth + 1);
                        if (!empty($sub)) {
                            $prop['properties'] = $sub;
                        }
                    }
                }
            }
            
            $props[$strKey] = $prop;
        }
        
        return $props;
    }
    
    /**
     * Add standard meta fields
     */
    public function addStandardMetaFields(array $props): array {
        foreach (['_links', '_embedded'] as $metaKey) {
            if (!isset($props[$metaKey])) {
                $props[$metaKey] = [
                    'type' => 'object',
                    'settings' => [
                        'disable' => false,
                        'filters' => [],
                    ],
                ];
            }
        }
        
        return $props;
    }
    
    /**
     * Infer JSON type
     */
    private function inferJsonType($value): string {
        if (is_null($value)) {
            return 'null';
        }
        
        if (is_bool($value)) {
            return 'boolean';
        }
        
        if (is_int($value)) {
            return 'integer';
        }
        
        if (is_float($value)) {
            return 'number';
        }
        
        if (is_string($value)) {
            return 'string';
        }
        
        if (is_array($value)) {
            // Check if array is sequential or associative
            foreach (array_keys($value) as $k) {
                if (!is_int($k)) {
                    return 'object';
                }
            }
            return 'array';
        }
        
        return 'object';
    }
}