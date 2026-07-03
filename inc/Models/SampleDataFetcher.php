<?php namespace Bromate\RestApiFirewall\Models;

defined('ABSPATH') || exit;

use WP_REST_Request;

class SampleDataFetcher {
    
    /**
     * Fetch sample REST data for a given object type
     */
    public function fetchSampleData(string $objectType): array {
        $restBase = '';
        $id = 0;
        
        if (taxonomy_exists($objectType)) {
            $taxObj = get_taxonomy($objectType);
            $restBase = $taxObj && !empty($taxObj->rest_base) 
                ? $taxObj->rest_base 
                : $objectType;
                
            $terms = get_terms([
                'taxonomy' => $objectType,
                'number' => 1,
                'hide_empty' => false,
                'fields' => 'ids',
            ]);
            
            if (is_wp_error($terms) || empty($terms)) {
                return [];
            }
            
            $id = (int) $terms[0];
            
        } else {
            $ptObj = get_post_type_object($objectType);
            
            if (!$ptObj) {
                return [];
            }
            
            $restBase = !empty($ptObj->rest_base) 
                ? $ptObj->rest_base 
                : $objectType;
            
            // Handle attachments specially
            if ('attachment' === $objectType) {
                return $this->fetchAttachmentSampleData($restBase);
            }
            
            $posts = get_posts([
                'post_type' => $objectType,
                'posts_per_page' => 1,
                'fields' => 'ids',
                'post_status' => ['publish', 'draft', 'private', 'inherit'],
            ]);
            
            if (empty($posts)) {
                return [];
            }
            
            $id = (int) $posts[0];
        }
        
        return $this->fetchRestData("/wp/v2/{$restBase}/{$id}");
    }
    
    /**
     * Fetch sample attachment data
     */
    public function fetchAttachmentSampleData(string $restBase): array {
        // Try image attachments first
        $candidateIds = get_posts([
            'post_type' => 'attachment',
            'posts_per_page' => 10,
            'fields' => 'ids',
            'post_status' => 'inherit',
            'post_mime_type' => 'image',
        ]);
        
        if (empty($candidateIds)) {
            $candidateIds = get_posts([
                'post_type' => 'attachment',
                'posts_per_page' => 3,
                'fields' => 'ids',
                'post_status' => 'inherit',
            ]);
        }
        
        if (empty($candidateIds)) {
            return [];
        }
        
        $fallback = [];
        
        foreach ($candidateIds as $attachmentId) {
            $data = $this->fetchRestData("/wp/v2/{$restBase}/" . (int) $attachmentId);
            
            if (empty($data)) {
                continue;
            }
            
            $sizes = isset($data['media_details']['sizes']) 
                ? (array) $data['media_details']['sizes'] 
                : [];
                
            if (!empty($sizes)) {
                return $data;
            }
            
            if (empty($fallback)) {
                $fallback = $data;
            }
        }
        
        return $fallback;
    }
    
    /**
     * Fetch REST data
     */
    public function fetchRestData(string $route): array {
        $request = new WP_REST_Request('GET', $route);
        $request->set_param('_embed', '1');
        $response = rest_do_request($request);
        
        if (is_wp_error($response) || 200 !== $response->get_status()) {
            return [];
        }
        
        $raw = rest_get_server()->response_to_data($response, true);
        $decoded = json_decode(wp_json_encode($raw), true);
        
        return null !== $decoded ? $decoded : [];
    }
}