// components/Models/ModelEditor.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useDialog, DIALOG_TYPES } from '@contexts/DialogContext';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { ModelsAPI } from '@services/models';
import { useModels } from '@hooks/useModels';
import { apiRequest } from '@services/api';

import { PropertyRow } from '@features/models/Properties';
import JsonSchemaBuilder from '@features/models/JsonSchemaBuilder';
import DataPanel from '@components/DataPanel';

import type { ModelEntry, ModelProperty, ModelFilter, ModelPropertySettings } from '@app-types/models';

interface ModelEditorProps {
  model: ModelEntry;
  onBack: () => void;
}

interface SavedSnapshot {
  title: string;
  description: string;
  objectType: string;
  isCustom: boolean;
  enabled: boolean;
  propertiesJson: string;
}

interface Binding {
  key: string;
  label: string;
  type: string;
  filters?: ModelFilter[];
}

const mergeFilterSettings = (
  schemaSettings: { filters?: ModelFilter[] } | undefined,
  storedSettings: { disable?: boolean; filters?: ModelFilter[] } | undefined
): ModelPropertySettings => {
  const schemaFilters = schemaSettings?.filters || [];
  const storedFilters = Array.isArray(storedSettings?.filters) ? storedSettings.filters : [];
  
  return {
    disable: storedSettings?.disable ?? false,
    filters: schemaFilters.map((sf) => {
      const s = storedFilters.find((f) => f.key === sf.key);
      return s !== undefined ? { ...sf, value: s.value } : sf;
    }),
  };
};

const mergePropertiesRecursively = (
  schemaPropMap: Record<string, ModelProperty> | undefined,
  storedPropMap: Record<string, ModelProperty> | undefined
): Record<string, ModelProperty> | undefined => {
  if (!schemaPropMap) return schemaPropMap;
  
  const result: Record<string, ModelProperty> = {};
  
  for (const [name, cfg] of Object.entries(schemaPropMap)) {
    if (typeof cfg === 'object' && cfg !== null) {
      const storedCfg = storedPropMap?.[name];
      
      result[name] = {
        ...cfg,
        settings: mergeFilterSettings(
          cfg.settings,
          storedCfg?.settings
        ),
        properties: mergePropertiesRecursively(
          cfg.properties,
          storedCfg?.properties
        ),
      };
    } else {
      result[name] = cfg;
    }
  }
  
  return result;
};

const applySettingToNode = (
  node: any,
  setting: string,
  key: string,
  value: any,
  schemaFilters?: ModelFilter[]
): any => {
  if (setting === 'settings') {
    return { ...node, settings: { ...(node.settings || {}), [key]: value } };
  }
  if (setting === 'filters') {
    const currentFilters = node.settings?.filters || schemaFilters || [];
    return {
      ...node,
      settings: {
        ...(node.settings || {}),
        filters: currentFilters.map((f: ModelFilter) => 
          f.key === key ? { ...f, value } : f
        ),
      },
    };
  }
  return node;
};

const deepSetSubPropSetting = (
  node: any,
  subPath: string[],
  setting: string,
  key: string,
  value: any,
  schemaCfg?: ModelProperty
): any => {
  const [head, ...rest] = subPath;
  const subSchema = schemaCfg?.properties?.[head];
  const currentChild = node.properties?.[head] || {
    settings: {
      disable: false,
      filters: (subSchema?.settings?.filters || []).map((f: ModelFilter) => ({ ...f })),
    },
  };
  
  return {
    ...node,
    properties: {
      ...(node.properties || {}),
      [head]:
        rest.length === 0
          ? applySettingToNode(currentChild, setting, key, value, subSchema?.settings?.filters)
          : deepSetSubPropSetting(currentChild, rest, setting, key, value, subSchema),
    },
  };
};

const FALLBACK_BINDINGS: Binding[] = [
  { key: 'id', label: 'ID', type: 'integer' },
  { key: 'slug', label: 'Slug', type: 'string' },
  { key: 'title', label: 'Title', type: 'string' },
  { key: 'content', label: 'Content', type: 'string' },
  { key: 'excerpt', label: 'Excerpt', type: 'string' },
  { key: 'status', label: 'Status', type: 'string' },
  { key: 'date', label: 'Date', type: 'string' },
  { key: 'modified', label: 'Modified', type: 'string' },
  { key: 'link', label: 'Link (URL)', type: 'string' },
  { key: 'author', label: 'Author ID', type: 'integer' },
  { key: 'featured_media', label: 'Featured Media ID', type: 'integer' },
  { key: 'categories', label: 'Categories', type: 'array' },
  { key: 'tags', label: 'Tags', type: 'array' },
  { key: 'meta', label: 'Meta', type: 'object' },
];

export default function ModelEditor({ model, onBack }: ModelEditorProps) {
  const { openDialog } = useDialog();
  const { updateModel, createModel, deleteModel } = useModels();

  const isNew = !model.id;

  // State
  const [title, setTitle] = useState(model.title || '');
  const [description, setDescription] = useState(model.description || '');
  const [objectType, setObjectType] = useState(model.object_type || 'post');
  const [isCustom, setIsCustom] = useState(model.is_custom || false);
  const [enabled, setEnabled] = useState(model.enabled || false);
  
  const [author, setAuthor] = useState('');
  const [dateCreated, setDateCreated] = useState('');
  const [dateModified, setDateModified] = useState('');
  
  const [wpProperties, setWpProperties] = useState<Record<string, any>>(
    !model.is_custom ? model.properties || {} : {}
  );
  const [customProperties, setCustomProperties] = useState<Record<string, any>>(
    model.is_custom ? model.properties || {} : {}
  );
  
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  
  const [testMode, setTestMode] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [testResult, setTestResult] = useState<{ raw?: any; transformed?: any; error?: string } | null>(null);
  const testAbortRef = useRef<AbortController | null>(null);
  
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot | null>(null);
  const [schema, setSchema] = useState<Record<string, ModelProperty> | null>(null);
  const [acfActive, setAcfActive] = useState(false);

  const properties = isCustom ? customProperties : wpProperties;
  const setProperties = isCustom ? setCustomProperties : setWpProperties;

  // Check if ACF is active
  useEffect(() => {
    // Check for ACF functions availability
    const checkAcf = async () => {
      try {
        // Try to fetch ACF status via API or check global
        const isAcfActive = typeof window !== 'undefined' && 
          !!(window as any).acf || 
          !!(window as any).acf_add_local_field_group;
        setAcfActive(isAcfActive);
      } catch {
        setAcfActive(false);
      }
    };
    checkAcf();
  }, []);

  // Fetch schema when object type changes using the AJAX API
  useEffect(() => {
    if (!objectType) {
      setSchema(null);
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);

    const fetchSchema = async () => {
      try {
        const response = await apiRequest<{ props: Record<string, ModelProperty> }>(
          'bromate_model_properties',
          { object_type: objectType }
        );
        
        if (!cancelled) {
          setSchema(response.props || null);
        }
      } catch (error) {
        if (!cancelled) {
          setSchema(null);
        }
      } finally {
        if (!cancelled) {
          setSchemaLoading(false);
        }
      }
    };

    fetchSchema();

    return () => {
      cancelled = true;
    };
  }, [objectType]);

  // Load existing model data
  useEffect(() => {
    if (!model.object_type && !objectType) {
      setLoaded(true);
      return;
    }

    const loadModel = async () => {
      try {
        if (model.id) {
          const response = await ModelsAPI.getModel(model.id);
          const entry = response.entry;
          
          setTitle(entry.title || '');
          setDescription(entry.description || '');
          setEnabled(entry.enabled ?? true);
          setAuthor(entry.author_name || '');
          setDateCreated(entry.date_created || '');
          setDateModified(entry.date_modified || '');
          setObjectType(entry.object_type || '');
          setIsCustom(entry.is_custom || false);
          
          if (entry.is_custom) {
            setCustomProperties(entry.properties || {});
          } else {
            setWpProperties(entry.properties || {});
          }
          
          setSavedSnapshot({
            title: entry.title || '',
            description: entry.description || '',
            objectType: entry.object_type || '',
            isCustom: entry.is_custom || false,
            enabled: entry.enabled ?? true,
            propertiesJson: JSON.stringify(entry.properties || {}),
          });
        }
      } finally {
        setLoaded(true);
      }
    };

    loadModel();
  }, [model.id, model.object_type]);

  const isDirty = useMemo(() => {
    if (isNew) {
      return !!title.trim();
    }
    if (!savedSnapshot) {
      return false;
    }
    
    return (
      title !== savedSnapshot.title ||
      description !== savedSnapshot.description ||
      objectType !== savedSnapshot.objectType ||
      isCustom !== savedSnapshot.isCustom ||
      enabled !== savedSnapshot.enabled ||
      JSON.stringify(properties) !== savedSnapshot.propertiesJson
    );
  }, [isNew, title, description, objectType, isCustom, enabled, properties, savedSnapshot]);

  const clearDirty = useCallback(() => {
    setSavedSnapshot({
      title: title.trim(),
      description,
      objectType,
      isCustom,
      enabled,
      propertiesJson: JSON.stringify(properties),
    });
  }, [title, description, objectType, isCustom, enabled, properties]);

  const handleBack = useCallback(() => {
    clearDirty();
    onBack();
  }, [clearDirty, onBack]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description,
        object_type: objectType,
        is_custom: isCustom,
        enabled,
        properties,
      };

      if (isNew) {
        const result = await createModel(payload);
        if (result) {
          clearDirty();
          onBack();
        }
      } else if (model.id) {
        const result = await updateModel(model.id, payload);
        if (result) {
          clearDirty();
        }
      }
    } catch (error) {
      // Error handled by hook
    } finally {
      setSaving(false);
    }
  }, [isNew, model.id, title, description, objectType, isCustom, enabled, properties, createModel, updateModel, clearDirty, onBack]);

  const handleDelete = useCallback(() => {
    if (!model.id) return;

    openDialog({
      type: DIALOG_TYPES.CONFIRM,
      title: __('Delete Model', 'rest-api-firewall'),
      content: `${__('Permanently delete', 'rest-api-firewall')} "${title}"? ${__('This action cannot be undone.', 'rest-api-firewall')}`,
      confirmLabel: __('Delete', 'rest-api-firewall'),
      onConfirm: async () => {
        await deleteModel(model.id!);
        clearDirty();
        onBack();
      },
    });
  }, [model.id, title, openDialog, deleteModel, clearDirty, onBack, __]);

  const runTest = useCallback(async () => {
    if (isNew || !model.id) {
      return;
    }

    setTestStatus('running');
    setTestResult(null);
    
    const controller = new AbortController();
    testAbortRef.current = controller;

    try {
      const result = await ModelsAPI.testModel(model.id);
      setTestResult(result);
      setTestStatus('done');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setTestResult({ error: __('Test failed.', 'rest-api-firewall') });
        setTestStatus('error');
      }
    }
  }, [isNew, model.id, __]);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (newMode === null) {
      return;
    }

    setTestMode(false);

    if (!isNew && enabled) {
      openDialog({
        type: DIALOG_TYPES.CONFIRM,
        title: __('Change Schema Mode', 'rest-api-firewall'),
        content: __(
          'This model is currently active. Changing the schema mode may affect the REST API output. Are you sure?',
          'rest-api-firewall'
        ),
        confirmLabel: __('Change Mode', 'rest-api-firewall'),
        onConfirm: () => setIsCustom(newMode === 'custom'),
      });
    } else {
      setIsCustom(newMode === 'custom');
    }
  };

  // Filter schema props for settings route
  const filteredSchema = useMemo(() => {
    if (objectType !== 'settings_route' || !schema) return schema;
    
    const result: Record<string, ModelProperty> = {};
    for (const [key, cfg] of Object.entries(schema)) {
      if (key === 'menus' && !properties._embed_menus) continue;
      if (key === 'acf_options' && !properties._acf_options_page) continue;
      result[key] = cfg;
    }
    return result;
  }, [schema, objectType, properties._embed_menus, properties._acf_options_page]);

  // Build available bindings
  const availableBindings = useMemo((): Binding[] => {
    if (!filteredSchema) return FALLBACK_BINDINGS;

    return Object.entries(filteredSchema).flatMap(([key, cfg]) => {
      const type = Array.isArray(cfg.type) ? cfg.type[0] : cfg.type;
      const topFilters = (cfg.settings?.filters || []).filter(
        (f) => f.key !== 'rendered'
      );
      
      const bindings: Binding[] = [
        { key, label: cfg.description || key, type, filters: topFilters },
      ];

      if (cfg.properties && typeof cfg.properties === 'object' && !Array.isArray(cfg.properties)) {
        Object.entries(cfg.properties).forEach(([subKey, subCfg]) => {
          if (typeof subCfg === 'object' && subCfg !== null) {
            const subFilters = (subCfg.settings?.filters || []).filter(
              (f) => f.key !== 'rendered'
            );
            bindings.push({
              key: `${key}.${subKey}`,
              label: subCfg.description || `${key}.${subKey}`,
              type: Array.isArray(subCfg.type) ? subCfg.type[0] : subCfg.type,
              filters: subFilters,
            });
          }
        });
      }

      return bindings;
    });
  }, [filteredSchema]);

  if (!loaded || schemaLoading) {
    return <CircularProgress />;
  }

  return (
    <Stack spacing={3} flexGrow={1}>
      {objectType && (
        <Stack direction="row" gap={2} alignItems="center" justifyContent="space-between" maxWidth={800}>
          <Stack direction="row" gap={2} alignItems="center">
            <Typography variant="subtitle1" fontWeight="600">
              {__('Object Type', 'rest-api-firewall')}
            </Typography>
            <Chip
              label={objectType}
              variant="outlined"
              color="primary"
              sx={{ fontFamily: 'monospace' }}
            />
          </Stack>
          {!isNew && (
            testMode ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  if (testAbortRef.current) {
                    testAbortRef.current.abort();
                  }
                  setTestMode(false);
                  setTestStatus('idle');
                  setTestResult(null);
                }}
              >
                <Typography variant="caption">
                  {__('Close Test', 'rest-api-firewall')}
                </Typography>
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                disableElevation
                disabled={testStatus === 'running'}
                onClick={() => {
                  setTestMode(true);
                  setTestStatus('idle');
                  setTestResult(null);
                  runTest();
                }}
              >
                <Typography variant="caption">
                  {testStatus === 'running'
                    ? __('Testing…', 'rest-api-firewall')
                    : __('Test', 'rest-api-firewall')}
                </Typography>
              </Button>
            )
          )}
        </Stack>
      )}

      {!testMode && (
        <Stack spacing={3} maxWidth={600}>
          <TextField
            label={__('Model Name', 'rest-api-firewall')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            fullWidth
            required
            inputProps={{ maxLength: 100 }}
            helperText={__('Internal name for this model.', 'rest-api-firewall')}
          />
          <TextField
            label={__('Description', 'rest-api-firewall')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            multiline
            rows={3}
            inputProps={{ maxLength: 300 }}
            helperText={__('Internal note for this model.', 'rest-api-firewall')}
          />

          {objectType === 'settings_route' && (
            <Stack spacing={3}>
              <FormControl disabled={testMode}>
                <FormControlLabel
                  label={__('Embed Flattened Menus', 'rest-api-firewall')}
                  control={
                    <Switch
                      checked={!!properties._embed_menus}
                      onChange={(e) =>
                        setProperties((p) => ({ ...p, _embed_menus: e.target.checked }))
                      }
                      size="small"
                    />
                  }
                />
              </FormControl>

              <FormControl disabled={!acfActive || testMode}>
                <FormControlLabel
                  label={__('Add ACF Options Pages', 'rest-api-firewall')}
                  control={
                    <Switch
                      checked={!!properties._acf_options_page}
                      onChange={(e) =>
                        setProperties((p) => ({ ...p, _acf_options_page: e.target.checked }))
                      }
                      size="small"
                    />
                  }
                />
              </FormControl>
            </Stack>
          )}
        </Stack>
      )}

      {objectType && (
        <Stack spacing={3} maxWidth={800}>
          {!testMode && (
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <ToggleButtonGroup
                value={isCustom ? 'custom' : 'wp'}
                exclusive
                onChange={handleModeChange}
                size="small"
              >
                <ToggleButton value="wp">
                  <Typography variant="caption">
                    {__('WordPress Schema', 'rest-api-firewall')}
                  </Typography>
                </ToggleButton>
                <ToggleButton value="custom">
                  <Typography variant="caption">
                    {__('Custom Schema', 'rest-api-firewall')}
                  </Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          )}

          {testMode ? (
            <Stack spacing={2}>
              {testStatus === 'running' && (
                <Stack direction="row" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    {__('Fetching live data and applying model…', 'rest-api-firewall')}
                  </Typography>
                </Stack>
              )}
              {testStatus === 'error' && testResult?.error && (
                <Alert severity="warning">{testResult.error}</Alert>
              )}
              {testStatus === 'done' && testResult && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                  <DataPanel
                    label={__('Raw', 'rest-api-firewall')}
                    data={testResult.raw}
                    labelColor="text.secondary"
                    bgcolor="grey.50"
                    status="success"
                  />
                  <DataPanel
                    label={__('Transformed', 'rest-api-firewall')}
                    data={testResult.transformed}
                    labelColor="primary.main"
                    status="success"
                    bgcolor={(theme: any) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(99, 132, 255, 0.08)'
                        : 'rgba(25, 118, 210, 0.04)'
                    }
                  />
                </Stack>
              )}
            </Stack>
          ) : isCustom ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>
                {__('Custom Schema', 'rest-api-firewall')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {__('Define the exact JSON shape your REST endpoint will return for this object type.', 'rest-api-firewall')}
              </Typography>
              <JsonSchemaBuilder
                value={properties}
                onChange={setProperties}
                availableBindings={availableBindings}
              />
            </Stack>
          ) : (
            <Stack>
              {filteredSchema ? (
                <Stack spacing={0}>
                  {Object.entries(filteredSchema).map(([propName, propConfig]) => (
                    <PropertyRow
                      key={propName}
                      propName={propName}
                      isInherit={
                        !properties[propName] ||
                        !Array.isArray(properties[propName]?.settings?.filters)
                      }
                      onToggleInherit={() => {
                        const current = properties[propName];
                        const hasLocalFilters = Array.isArray(current?.settings?.filters);
                        
                        if (hasLocalFilters) {
                          if (current?.settings?.disable === true) {
                            setProperties((prev) => ({
                              ...prev,
                              [propName]: { settings: { disable: true } },
                            }));
                          } else {
                            setProperties((prev) => {
                              const next = { ...prev };
                              delete next[propName];
                              return next;
                            });
                          }
                        } else {
                          setProperties((prev) => ({
                            ...prev,
                            [propName]: {
                              ...(prev[propName] || {}),
                              settings: {
                                disable: prev[propName]?.settings?.disable ?? propConfig.settings?.disable ?? false,
                                filters: (propConfig.settings?.filters || []).map((f: ModelFilter) => ({ ...f })),
                              },
                            },
                          }));
                        }
                      }}
                      propConfig={{
                        ...propConfig,
                        settings: mergeFilterSettings(
                          propConfig.settings,
                          properties[propName]?.settings
                        ),
                        properties: mergePropertiesRecursively(
                          propConfig.properties,
                          properties[propName]?.properties
                        ),
                      }}
                      selectedObjectType={objectType}
                      setField={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const path = e.target.name;
                        const parts = path.split('.');
                        const propsIdx = parts.indexOf('props');
                        const propKey = parts[propsIdx + 1] || propName;

                        const subPath: string[] = [];
                        let i = propsIdx + 2;
                        while (i < parts.length && parts[i] === 'properties') {
                          subPath.push(parts[i + 1]);
                          i += 2;
                        }
                        
                        let setting = parts[i];
                        let key = parts[i + 1];
                        if (setting === 'settings' && key === 'filters' && parts[i + 2] !== undefined) {
                          setting = 'filters';
                          key = parts[i + 2];
                        }

                        setProperties((prev) => {
                          const next = { ...prev };
                          
                          if (!next[propKey]) {
                            if (setting === 'settings' && key === 'disable') {
                              next[propKey] = { settings: { disable: false } };
                            } else {
                              next[propKey] = {
                                settings: {
                                  disable: false,
                                  filters: (propConfig.settings?.filters || []).map((f: ModelFilter) => ({ ...f })),
                                },
                              };
                            }
                          }
                          
                          if (subPath.length === 0) {
                            next[propKey] = applySettingToNode(
                              next[propKey],
                              setting,
                              key,
                              e.target.value,
                              propConfig.settings?.filters
                            );
                          } else {
                            next[propKey] = deepSetSubPropSetting(
                              next[propKey],
                              subPath,
                              setting,
                              key,
                              e.target.value,
                              filteredSchema?.[propKey]
                            );
                          }
                          
                          return next;
                        });
                      }}
                      globalForm={null}
                      __={__}
                      basePath={`postProperties.${objectType}.props.${propName}`}
                    />
                  ))}
                </Stack>
              ) : (
                <Alert severity="warning">
                  {__('No WP REST schema found for this object type. Try switching to Custom mode.', 'rest-api-firewall')}
                </Alert>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}