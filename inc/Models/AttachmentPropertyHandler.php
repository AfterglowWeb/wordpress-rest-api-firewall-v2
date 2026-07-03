<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

class AttachmentPropertyHandler {
    

    public function enhanceAttachmentProperties(array $props, string $postType): array {
        if ('attachment' === $postType && 
            isset($props['media_details']) && 
            empty($props['media_details']['properties'])) {
            $props['media_details']['properties'] = $this->buildMediaDetailsFallbackProps();
        }
        
        return $props;
    }
    

    private function buildMediaDetailsFallbackProps(): array {
        $emptySettings = [
            'disable' => false,
            'filters' => [],
        ];
        
        $stringProp = [
            'type' => 'string',
            'settings' => $emptySettings,
        ];
        
        $integerProp = [
            'type' => 'integer',
            'settings' => $emptySettings,
        ];
        
        $sizeProperties = [
            'file' => $stringProp,
            'width' => $integerProp,
            'height' => $integerProp,
            'mime_type' => $stringProp,
            'source_url' => $stringProp,
        ];
        
        $sizesProps = [];
        
        if (function_exists('wp_get_registered_image_subsizes')) {
            foreach (array_keys(wp_get_registered_image_subsizes()) as $sizeName) {
                $sizesProps[$sizeName] = [
                    'type' => 'object',
                    'settings' => $emptySettings,
                    'properties' => $sizeProperties,
                ];
            }
        }
        
        return [
            'width' => $integerProp,
            'height' => $integerProp,
            'file' => $stringProp,
            'filesize' => $integerProp,
            'sizes' => [
                'type' => 'object',
                'settings' => $emptySettings,
                'properties' => $sizesProps,
            ],
            'image_meta' => [
                'type' => 'object',
                'settings' => $emptySettings,
            ],
        ];
    }
}