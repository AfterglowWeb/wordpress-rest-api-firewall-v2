// hooks/useModelProperties.ts

import { useState, useEffect, useCallback } from '@wordpress/element';
import { ModelsAPI } from '@services/models';
import type { ModelProperty, ModelSchema } from '@app-types/models';

interface UseModelPropertiesReturn {
  schema: Record<string, ModelProperty> | null;
  loading: boolean;
  error: string | null;
  fetchSchema: (objectType: string) => Promise<void>;
}

export function useModelProperties(): UseModelPropertiesReturn {
  const [schema, setSchema] = useState<Record<string, ModelProperty> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async (objectType: string) => {
    if (!objectType) {
      setSchema(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await ModelsAPI.getModelProperties(objectType);
      setSchema(response.props || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schema');
      setSchema(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    schema,
    loading,
    error,
    fetchSchema,
  };
}