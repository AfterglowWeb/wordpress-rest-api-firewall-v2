<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

use Bromate\RestApiFirewall\Core\Settings\SettingsAjaxController;
use Bromate\RestApiFirewall\Models\WordPressObjects;

class ModelsPropertiesRepository {
    
    private FilterManager $filterManager;
    private ModelPropertyBuilder $propertyBuilder;
    private SampleDataFetcher $sampleDataFetcher;
    private AuthorPropertyHandler $authorHandler;
    private SettingsPropertyHandler $settingsHandler;
    private AttachmentPropertyHandler $attachmentHandler;
    private AcfPropertyHandler $acfHandler;
    private SecurityManager $securityManager;
    
    public function __construct() {
        $this->filterManager = new FilterManager();
        $this->propertyBuilder = new ModelPropertyBuilder($this->filterManager);
        $this->sampleDataFetcher = new SampleDataFetcher();
        $this->authorHandler = new AuthorPropertyHandler(
            $this->propertyBuilder,
            $this->filterManager,
            $this->sampleDataFetcher,
            new SecurityManager()
        );
        $this->settingsHandler = new SettingsPropertyHandler(
            $this->propertyBuilder,
            $this->filterManager,
            $this->sampleDataFetcher
        );
        $this->attachmentHandler = new AttachmentPropertyHandler();
        $this->acfHandler = new AcfPropertyHandler($this->filterManager);
        $this->securityManager = new SecurityManager();

        add_action('wp_ajax_bromate_model_properties', [$this, 'ajax_model_properties']);
    }


    public function ajax_model_properties(): void {
        if (false === SettingsAjaxController::ajax_validate_has_firewall_admin_caps()) {
            wp_send_json_error(
                ['message' => __('Unauthorized.', 'bromate-rest-api-firewall')],
                403
            );
        }
        
        $objectType = sanitize_key(wp_unslash($_POST['object_type'] ?? ''));
        
        if (empty($objectType)) {
            wp_send_json_error(['message' => 'Missing object_type.'], 400);
        }
        
        wp_send_json_success([
            'props' => self::model_properties_for_type($objectType)
        ]);
    }
    
    public static function models_properties(): array {
        $instance = new self();
        $objectTypes = self::list_rest_api_object_types();
        $result = [];
        
        foreach ($objectTypes as $objectType) {
            $typeValue = $objectType['value'];
            $result[$typeValue] = [
                'label' => $objectType['label'],
                'settings' => [],
                'props' => self::model_properties($typeValue),
            ];
        }
        
        $result['settings_route'] = [
            'label' => 'Settings Route',
            'settings' => [],
            'props' => self::settings_route_properties(),
        ];
        
        return $result;
    }
    

    public static function list_rest_api_object_types(): array {
        return array_merge(
            WordPressObjects::list_post_types(),
            WordPressObjects::list_taxonomies(),
            self::list_authors()
        );
    }
    
    public static function model_properties_for_type(string $objectType): array {
        if ('settings_route' === $objectType) {
            return self::settings_route_properties();
        }
        return self::model_properties($objectType);
    }
    
    public static function model_properties(string $postType): array {
        $instance = new self();
        
        if ('author' === $postType) {
            return $instance->authorHandler->getProperties();
        }
        
        $filters = $instance->filterManager->getFilters();
        $stringAutoFilters = $instance->filterManager->getStringAutoFilters($filters);
        
        $data = $instance->sampleDataFetcher->fetchSampleData($postType);
        
        if (!empty($data)) {
            $props = $instance->propertyBuilder->buildFromData($data, $filters);
            $props = $instance->acfHandler->enhanceWithAcfFields($props, $postType, $stringAutoFilters);
            $props = $instance->attachmentHandler->enhanceAttachmentProperties($props, $postType);
            return $props;
        }
        
        $controller = self::get_rest_controller($postType);
        
        if (!$controller || !method_exists($controller, 'get_item_schema')) {
            return [];
        }
        
        $schema = $controller->get_item_schema();
        
        if (empty($schema['properties'])) {
            return [];
        }
        
        $props = $instance->propertyBuilder->buildFromSchema(
            $schema['properties'],
            $filters,
            $stringAutoFilters
        );
        
        $props = $instance->acfHandler->enhanceWithAcfFields($props, $postType, $stringAutoFilters);
        $props = $instance->propertyBuilder->addStandardMetaFields($props);
        $props = $instance->attachmentHandler->enhanceAttachmentProperties($props, $postType);
        
        return $props;
    }
    
    /**
     * Get settings route properties
     */
    public static function settings_route_properties(): array {
        return (new self())->settingsHandler->getProperties();
    }
    
    /**
     * Get REST controller
     */
    public static function get_rest_controller(string $objectType, string $subtype = ''): ?object {
        $objectType = sanitize_key($objectType);
        
        if ('site' === $objectType) {
            return new \WP_REST_Settings_Controller();
        }
        
        if ('term' === $objectType) {
            $taxonomy = !empty($subtype) ? $subtype : 'category';
            
            if (taxonomy_exists($taxonomy)) {
                return new \WP_REST_Terms_Controller($taxonomy);
            }
            
            return null;
        }
        
        if (taxonomy_exists($objectType)) {
            return new \WP_REST_Terms_Controller($objectType);
        }
        
        $postTypeObject = get_post_type_object($objectType);
        
        if (!($postTypeObject instanceof \WP_Post_Type) || !$postTypeObject->show_in_rest) {
            return null;
        }
        
        if ('attachment' === $objectType) {
            return new \WP_REST_Attachments_Controller('attachment');
        }
        
        $controllerClass = $postTypeObject->rest_controller_class;
        
        if (!class_exists($controllerClass)) {
            $controllerClass = 'WP_REST_Posts_Controller';
        }
        
        return new $controllerClass($objectType);
    }
    
    /**
     * List authors
     */
    public static function list_authors(): array {
        return [
            [
                'id' => 0,
                'display_name' => __('Author', 'bromate-rest-api-firewall'),
            ],
        ];
    }
}