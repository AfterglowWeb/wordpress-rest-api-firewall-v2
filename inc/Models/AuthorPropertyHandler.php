<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

use WP_REST_Users_Controller;

class AuthorPropertyHandler {
    
    private ModelPropertyBuilder $propertyBuilder;
    private FilterManager $filterManager;
    private SampleDataFetcher $sampleDataFetcher;
    private SecurityManager $securityManager;
    
    public function __construct(
        ModelPropertyBuilder $propertyBuilder,
        FilterManager $filterManager,
        SampleDataFetcher $sampleDataFetcher,
        SecurityManager $securityManager
    ) {
        $this->propertyBuilder = $propertyBuilder;
        $this->filterManager = $filterManager;
        $this->sampleDataFetcher = $sampleDataFetcher;
        $this->securityManager = $securityManager;
    }
    

    public function getProperties(): array {
        $filters = $this->filterManager->getFilters();
        $stringAutoFilters = $this->filterManager->getStringAutoFilters($filters);
        
        $users = get_users([
            'number' => 1,
            'fields' => 'ids',
        ]);
        
        if (!empty($users)) {
            $id = (int) $users[0];
            $data = $this->sampleDataFetcher->fetchRestData("/wp/v2/users/{$id}");
            
            if (!empty($data)) {
                $props = $this->propertyBuilder->buildFromData($data, $filters);
                return $this->securityManager->applyAuthorSecurityFlags($props);
            }
        }
        
        $controller = new WP_REST_Users_Controller();
        $schema = $controller->get_item_schema();
        
        if (empty($schema['properties'])) {
            return [];
        }
        
        $props = $this->propertyBuilder->buildFromSchema(
            $schema['properties'],
            $filters,
            $stringAutoFilters
        );
        
        $props = $this->propertyBuilder->addStandardMetaFields($props);
        
        return $this->securityManager->applyAuthorSecurityFlags($props);
    }
}