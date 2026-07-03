// @services/models/index.ts

import { apiRequest } from '@services/api';
import type {
  ModelEntry,
  ModelsSettings,
  ModelPropertiesResponse,
  ModelsListResponse,
  SaveModelResponse,
  TestModelResponse,
  ApiResponse,
} from '@app-types/models';

export const ModelsAPI = {
  /**
   * Get list of all model entries
   */
  getModels: (): Promise<ModelsListResponse> =>
    apiRequest<ModelsListResponse>('bromate_get_models'),

  /**
   * Get a single model entry by ID
   */
  getModel: (id: number): Promise<{ entry: ModelEntry }> =>
    apiRequest<{ entry: ModelEntry }>('bromate_get_model', { id }),

  /**
   * Get schema properties for an object type
   */
  getModelProperties: (objectType: string): Promise<ModelPropertiesResponse> =>
    apiRequest<ModelPropertiesResponse>('bromate_get_model_properties', {
      object_type: objectType,
    }),

  /**
   * Create a new model entry
   */
  createModel: (payload: Partial<ModelEntry>): Promise<SaveModelResponse> =>
    apiRequest<SaveModelResponse>('bromate_create_model', {
      title: payload.title,
      description: payload.description,
      object_type: payload.object_type,
      is_custom: payload.is_custom ? '1' : '0',
      enabled: payload.enabled ? '1' : '0',
      properties: JSON.stringify(payload.properties || {}),
    }),

  /**
   * Update an existing model entry
   */
  updateModel: (id: number, payload: Partial<ModelEntry>): Promise<SaveModelResponse> =>
    apiRequest<SaveModelResponse>('bromate_update_model', {
      id,
      title: payload.title,
      description: payload.description,
      object_type: payload.object_type,
      is_custom: payload.is_custom ? '1' : '0',
      enabled: payload.enabled ? '1' : '0',
      properties: JSON.stringify(payload.properties || {}),
    }),

  /**
   * Delete a model entry
   */
  deleteModel: (id: number): Promise<ApiResponse> =>
    apiRequest<ApiResponse>('bromate_delete_model', { id }),

  /**
   * Delete multiple model entries
   */
  deleteModels: (ids: number[]): Promise<ApiResponse> =>
    apiRequest<ApiResponse>('bromate_delete_models', {
      ids: JSON.stringify(ids),
    }),

  /**
   * Toggle model enabled status
   */
  toggleModel: (id: number, enabled: boolean): Promise<ApiResponse> =>
    apiRequest<ApiResponse>('bromate_toggle_model', {
      id,
      enabled: enabled ? '1' : '0',
    }),

  /**
   * Test a model against live data
   */
  testModel: (id: number): Promise<TestModelResponse> =>
    apiRequest<TestModelResponse>('bromate_test_model', { id }),

  /**
   * Get global settings
   */
  getGlobalSettings: (): Promise<{ settings: ModelsSettings }> =>
    apiRequest<{ settings: ModelsSettings }>('bromate_get_models_global_settings'),

  /**
   * Save global settings
   */
  saveGlobalSettings: (settings: ModelsSettings): Promise<ApiResponse> =>
    apiRequest<ApiResponse>('bromate_save_models_global_settings', {
      settings: JSON.stringify(settings),
    }),

  /**
   * Apply global settings to all models
   */
  applyGlobalSettings: (settings: ModelsSettings): Promise<ApiResponse> =>
    apiRequest<ApiResponse>('bromate_apply_models_global_settings', {
      settings: JSON.stringify(settings),
    }),
};