// hooks/useModels.ts

import { useState, useEffect, useCallback } from '@wordpress/element';
import { ModelsAPI } from '@services/models';
import type { ModelEntry, ModelProperty, ModelSchema } from '@app-types/models';

interface UseModelsReturn {
  models: ModelEntry[];
  loading: boolean;
  error: string | null;
  fetchModels: () => Promise<void>;
  toggleModel: (id: number, enabled: boolean) => Promise<void>;
  deleteModel: (id: number) => Promise<void>;
  deleteModels: (ids: number[]) => Promise<void>;
  createModel: (payload: Partial<ModelEntry>) => Promise<ModelEntry>;
  updateModel: (id: number, payload: Partial<ModelEntry>) => Promise<ModelEntry>;
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ModelsAPI.getModels();
      setModels(response.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleModel = useCallback(async (id: number, enabled: boolean) => {
    try {
      await ModelsAPI.toggleModel(id, enabled);
      await fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle model');
      throw err;
    }
  }, [fetchModels]);

  const deleteModel = useCallback(async (id: number) => {
    try {
      await ModelsAPI.deleteModel(id);
      await fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
      throw err;
    }
  }, [fetchModels]);

  const deleteModels = useCallback(async (ids: number[]) => {
    try {
      await ModelsAPI.deleteModels(ids);
      await fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete models');
      throw err;
    }
  }, [fetchModels]);

  const createModel = useCallback(async (payload: Partial<ModelEntry>) => {
    try {
      const response = await ModelsAPI.createModel(payload);
      await fetchModels();
      return response.entry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create model');
      throw err;
    }
  }, [fetchModels]);

  const updateModel = useCallback(async (id: number, payload: Partial<ModelEntry>) => {
    try {
      const response = await ModelsAPI.updateModel(id, payload);
      await fetchModels();
      return response.entry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model');
      throw err;
    }
  }, [fetchModels]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    loading,
    error,
    fetchModels,
    toggleModel,
    deleteModel,
    deleteModels,
    createModel,
    updateModel,
  };
}