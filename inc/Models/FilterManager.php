<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

use Bromate\RestApiFirewall\Models\WordPressObjects;

class FilterManager {
    
    private const SEARCH_REPLACE_FILTER_KEY = 'search_replace';
    private const RENDERED_FILTER_KEY = 'rendered';
    private array $filtersCache = [];
    
    /**
     * Get all property filters
     */
    public function getFilters(): array {
        if (!empty($this->filtersCache)) {
            return $this->filtersCache;
        }
        
        $taxonomyOptions = WordPressObjects::list_taxonomies();
        
        $taxonomyValues = array_map(
            fn($taxonomyOption) => $this->normalizeTaxonomyName($taxonomyOption['value']),
            $taxonomyOptions
        );
        
        $filters = [
            [
                'key' => 'embed',
                'tooltip' => esc_html__('Resolve Object', 'bromate-rest-api-firewall'),
                'label' => esc_html__('Resolve Object', 'bromate-rest-api-firewall'),
                'properties' => array_merge(
                    ['featured_media', 'author'],
                    $taxonomyValues
                ),
            ],
            [
                'key' => self::RENDERED_FILTER_KEY,
                'tooltip' => esc_html__('Flatten Rendered', 'bromate-rest-api-firewall'),
                'label' => esc_html__('Flatten Rendered', 'bromate-rest-api-firewall'),
                'properties' => [],
            ],
            [
                'key' => 'date_format',
                'tooltip' => esc_html__('Date Format', 'bromate-rest-api-firewall'),
                'label' => esc_html__('DateFormat', 'bromate-rest-api-firewall'),
                'properties' => [
                    'date', 'date_gmt', 'modified', 'modified_gmt', 'registered_date'
                ],
            ],
            [
                'key' => 'relative_url',
                'tooltip' => esc_html__('Relative URL', 'bromate-rest-api-firewall'),
                'label' => esc_html__('Relative URL', 'bromate-rest-api-firewall'),
                'properties' => ['file', 'link', 'source_url', 'guid'],
            ],
            [
                'key' => 'remove_uploads_path',
                'tooltip' => esc_html__('Remove Uploads Path', 'bromate-rest-api-firewall'),
                'label' => esc_html__('Remove Uploads Path', 'bromate-rest-api-firewall'),
                'properties' => ['file', 'source_url', 'guid', 'link'],
            ],
            [
                'key' => self::SEARCH_REPLACE_FILTER_KEY,
                'type' => 'search_replace',
                'tooltip' => esc_html__('Search & Replace', 'bromate-rest-api-firewall'),
                'label' => esc_html__('Search & Replace', 'bromate-rest-api-firewall'),
                'properties' => [
                    'title', 'content', 'excerpt', 'guid', 'link',
                    'source_url', 'description', 'name', 'slug'
                ],
            ],
        ];
        
        $this->filtersCache = $filters;
        return $filters;
    }
    
    /**
     * Get string auto-filters
     */
    public function getStringAutoFilters(array $filters): array {
        return array_values(
            array_filter(
                $filters,
                fn($f) => in_array($f['key'], [self::SEARCH_REPLACE_FILTER_KEY], true)
            )
        );
    }
    
    /**
     * Get filters for a specific property
     */
    public function getFiltersPerProperty(string $propertyKey, array $filters): array {
        $propertyFilters = [];
        
        foreach ($filters as $filter) {
            if (in_array($propertyKey, $filter['properties'], true)) {
                $propertyFilters[] = $filter;
            }
        }
        
        return $propertyFilters;
    }
    
    /**
     * Remove search replace filter from array
     */
    public function removeSearchReplaceFilter(array $filters): array {
        return array_values(
            array_filter(
                $filters,
                fn($f) => self::SEARCH_REPLACE_FILTER_KEY !== $f['key']
            )
        );
    }
    
    /**
     * Add missing string filters
     */
    public function addMissingStringFilters(
        array $propertyFilters,
        array $stringAutoFilters
    ): array {
        $existingKeys = array_column($propertyFilters, 'key');
        
        foreach ($stringAutoFilters as $filter) {
            if (!in_array($filter['key'], $existingKeys, true)) {
                $propertyFilters[] = $filter;
            }
        }
        
        return $propertyFilters;
    }
    
    /**
     * Maybe add rendered filter
     */
    public function maybeAddRenderedFilter(array &$propertyFilters, array $filters): void {
        $existingKeys = array_column($propertyFilters, 'key');
        
        if (in_array(self::RENDERED_FILTER_KEY, $existingKeys, true)) {
            return;
        }
        
        foreach ($filters as $filter) {
            if (self::RENDERED_FILTER_KEY === ($filter['key'] ?? '')) {
                $propertyFilters[] = $filter;
                return;
            }
        }
    }
    
    /**
     * Normalize taxonomy name
     */
    private function normalizeTaxonomyName(string $taxonomy): string {
        if ('category' === $taxonomy) {
            return 'categories';
        }
        
        if ('post_tag' === $taxonomy) {
            return 'tags';
        }
        
        return $taxonomy;
    }
    
    /**
     * Check if type is string
     */
    public function isStringType($type): bool {
        return 'string' === $type || 
            (is_array($type) && in_array('string', $type, true));
    }
}