// hooks/useGlobalSettings.ts

import { useState, useEffect, useCallback } from '@wordpress/element';
import { ModelsAPI } from '@services/models';
import type { ModelsSettings } from '@app-types/models';

interface UseGlobalSettingsReturn {
  settings: ModelsSettings;
  loading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<ModelsSettings>) => Promise<void>;
  applyToAll: (settings: ModelsSettings) => Promise<void>;
}

export function useModelsGlobalSettings(): UseGlobalSettingsReturn {
  const [settings, setSettings] = useState<ModelsSettings>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ModelsAPI.getGlobalSettings();
      setSettings(response.settings || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch global settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<ModelsSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await ModelsAPI.saveGlobalSettings(updated);
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save global settings');
      throw err;
    }
  }, [settings]);

  const applyToAll = useCallback(async (settingsToApply: ModelsSettings) => {
    try {
      await ModelsAPI.applyGlobalSettings(settingsToApply);
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply global settings');
      throw err;
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    applyToAll,
  };
}