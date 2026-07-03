// @app-types/models/index.ts

export interface ModelFilter {
  key: string;
  tooltip?: string;
  label: string;
  type?: string;
  properties: string[];
  value?: any;
}

export interface ModelPropertySettings {
  disable: boolean;
  locked?: boolean;
  filters: ModelFilter[];
}

export interface ModelProperty {
  type: string | string[];
  description?: string;
  settings: ModelPropertySettings;
  properties?: Record<string, ModelProperty>;
}

export interface ModelSchema {
  label: string;
  settings: Record<string, any>;
  props: Record<string, ModelProperty>;
}

export interface ModelEntry {
  id: number | null;
  title: string;
  description: string;
  object_type: string;
  is_custom: boolean;
  enabled: boolean;
  properties: Record<string, any>;
  author_name?: string;
  date_created?: string;
  date_modified?: string;
}

export interface ModelsSettings {
  rest_models_relative_url_enabled?: boolean;
  rest_models_relative_attachment_url_enabled?: boolean;
  rest_models_remove_links_prop?: boolean;
  rest_models_remove_embed_prop?: boolean;
  rest_models_remove_empty_props?: boolean;
  rest_models_remove_empty_props_recursively?: boolean;
  rest_models_resolve_rendered_props?: boolean;
  rest_models_embed_featured_attachment_enabled?: boolean;
  rest_models_embed_post_attachments_enabled?: boolean;
  rest_models_embed_terms_enabled?: boolean;
  rest_models_embed_author_enabled?: boolean;
  rest_models_date_format_enabled?: boolean;
  rest_models_date_format?: 'wordpress' | 'custom';
  rest_models_date_format_custom?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ModelsListResponse {
  entries: ModelEntry[];
}

export interface ModelPropertiesResponse {
  props: Record<string, ModelProperty>;
}

export interface SaveModelResponse {
  entry: ModelEntry;
  message: string;
}

export interface TestModelResponse {
  raw: any;
  transformed: any;
}