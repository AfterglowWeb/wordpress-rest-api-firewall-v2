// features/models/Properties.tsx

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Badge from '@mui/material/Badge';
import CircularProgress from '@mui/material/CircularProgress';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';

import { apiRequest } from '@services/api';
import CopyButton from '@components/CopyButton';
import type { ModelFilter, ModelProperty, ModelPropertySettings, ModelsSettings } from '@app-types/models';

// Type definitions
interface FiltersMenuProps {
  filters: ModelFilter[];
  propName: string;
  isInherit?: boolean;
  globalForm?: ModelsSettings | null;
  onToggleInherit?: () => void;
  setField: (event: any) => void;
  basePath: string;
  disabled?: boolean;
  hasValidLicense?: boolean;
  onSaveFilters?: (filters: ModelFilter[]) => void;
  __: (text: string) => string;
}

interface PropertyRowProps {
  propName: string;
  propConfig: ModelProperty;
  selectedObjectType: string;
  setField: (event: any) => void;
  hasValidLicense?: boolean;
  __: (text: string) => string;
  depth?: number;
  basePath?: string;
  alwaysExpanded?: boolean;
  disabled?: boolean;
  isInherit?: boolean;
  onToggleInherit?: () => void;
  globalForm?: ModelsSettings | null;
}

interface ModelPropertiesProps {
  selectedObjectType: string;
  setField: (event: any) => void;
  globalForm?: ModelsSettings | null;
}

const TYPE_COLORS: Record<string, 'default' | 'primary' | 'info' | 'secondary' | 'warning'> = {
  string: 'default',
  integer: 'primary',
  number: 'primary',
  boolean: 'info',
  object: 'secondary',
  array: 'warning',
};

const TYPE_LABELS: Record<string, string> = {
  post_type: 'Post Type',
  taxonomy: 'Taxonomy',
  author: 'User',
};

const MAX_PROPERTY_DEPTH = 2;

// Helper functions
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

const resolveGlobalFilterValue = (
  filterKey: string,
  propName: string,
  globalForm?: ModelsSettings | null
): boolean => {
  if (!globalForm) return false;
  
  switch (filterKey) {
    case 'relative_url':
      return !!globalForm.rest_models_relative_url_enabled;
    case 'remove_uploads_path':
      return !!globalForm.rest_models_relative_attachment_url_enabled;
    case 'rendered':
      return !!globalForm.rest_models_resolve_rendered_props;
    case 'embed':
      if (propName === 'featured_media') return !!globalForm.rest_models_embed_featured_attachment_enabled;
      if (propName === 'author') return !!globalForm.rest_models_embed_author_enabled;
      return !!globalForm.rest_models_embed_terms_enabled;
    default:
      return false;
  }
};

// FiltersMenu Component
export function FiltersMenu({
  filters,
  propName,
  isInherit = false,
  globalForm = null,
  onToggleInherit,
  setField,
  basePath,
  disabled = false,
  hasValidLicense = true,
  onSaveFilters = undefined,
  __,
}: FiltersMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const [localFilters, setLocalFilters] = useState<ModelFilter[]>([]);

  const activeCount = isInherit ? 0 : filters.filter((f) => {
    if (f.type === 'search_replace') return !!(f.value?.search);
    const globalValue = !!resolveGlobalFilterValue(f.key, propName, globalForm);
    return !!f.value !== globalValue;
  }).length;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setLocalFilters(
      filters.map((f) => {
        if (f.type === 'search_replace') {
          const v = (f.value && typeof f.value === 'object') ? f.value : {};
          return { ...f, value: { ...v } };
        }
        const val = isInherit
          ? !!resolveGlobalFilterValue(f.key, propName, globalForm)
          : !!f.value;
        return { ...f, value: val };
      })
    );
    setAnchorEl(e.currentTarget);
  };

  const handleCancel = () => setAnchorEl(null);

  const handleSave = () => {
    if (onSaveFilters) {
      onSaveFilters(localFilters.map((f) => ({
        ...f,
        value: f.value ?? (f.type === 'search_replace' ? {} : false),
      })));
    } else {
      localFilters.forEach((f) => {
        setField({
          target: {
            name: `${basePath}.settings.filters.${f.key}`,
            value: f.value ?? (f.type === 'search_replace' ? {} : false),
          },
        });
      });
    }
    setAnchorEl(null);
  };

  const patchLocal = (filterKey: string, newValue: any) => {
    setLocalFilters((prev) =>
      prev.map((f) => (f.key === filterKey ? { ...f, value: newValue } : f))
    );
  };

  const patchLocalSR = (filterKey: string, changes: Record<string, any>) => {
    setLocalFilters((prev) =>
      prev.map((f) => {
        if (f.key !== filterKey) return f;
        const v = (f.value && typeof f.value === 'object') ? f.value : {};
        return { ...f, value: { ...v, ...changes } };
      })
    );
  };

  const isFormDisabled = disabled || !hasValidLicense;

  const renderBooleanFilter = (filter: ModelFilter) => {
    const local = localFilters.find((f) => f.key === filter.key);
    const checked = local ? !!local.value : false;

    const relUrlLocal = localFilters.find((f) => f.key === 'relative_url');
    const isDepDisabled = filter.key === 'remove_uploads_path' && !(relUrlLocal ? !!relUrlLocal.value : false);
    const effectivelyDisabled = isFormDisabled || isDepDisabled;

    return (
      <MenuItem
        key={filter.key}
        dense
        sx={{ gap: 1 }}
        onClick={() => !effectivelyDisabled && patchLocal(filter.key, !checked)}
      >
        <Checkbox
          size="small"
          checked={checked}
          disabled={effectivelyDisabled}
          tabIndex={-1}
          disableRipple
          sx={{ p: 0.25 }}
        />
        <Typography
          variant="body2"
          sx={{ flex: 1 }}
          color={effectivelyDisabled ? 'text.disabled' : 'text.primary'}
        >
          {filter.tooltip || filter.label}
        </Typography>
      </MenuItem>
    );
  };

  const renderSearchReplaceFilter = (filter: ModelFilter) => {
    const local = localFilters.find((f) => f.key === filter.key);
    const val = (local?.value && typeof local.value === 'object') ? local.value : {};

    return (
      <Box key={filter.key} sx={{ px: 2, py: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 0.75, fontWeight: 500 }}
        >
          {filter.tooltip || filter.label}
        </Typography>
        <Stack spacing={0.75}>
          <TextField
            size="small"
            placeholder={__('Search', 'bromate-rest-api-firewall')}
            value={val.search || ''}
            disabled={isFormDisabled}
            onChange={(e) => patchLocalSR(filter.key, { search: e.target.value })}
            inputProps={{ style: { fontSize: '0.8rem' } }}
            fullWidth
          />
          <TextField
            size="small"
            placeholder={__('Replace with', 'bromate-rest-api-firewall')}
            value={val.replace || ''}
            disabled={isFormDisabled}
            onChange={(e) => patchLocalSR(filter.key, { replace: e.target.value })}
            inputProps={{ style: { fontSize: '0.8rem' } }}
            fullWidth
          />
          <Stack direction="row" flexWrap="wrap">
            {[
              { key: 'case_sensitive', label: __('Case sensitive', 'bromate-rest-api-firewall') },
              { key: 'whole_word', label: __('Whole word', 'bromate-rest-api-firewall') },
              { key: 'regex', label: __('Regex', 'bromate-rest-api-firewall') },
            ].map((opt) => (
              <FormControlLabel
                key={opt.key}
                disabled={isFormDisabled}
                control={
                  <Checkbox
                    size="small"
                    checked={!!val[opt.key]}
                    onChange={(e) => patchLocalSR(filter.key, { [opt.key]: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">{opt.label}</Typography>}
                sx={{ mr: 1 }}
              />
            ))}
          </Stack>
        </Stack>
      </Box>
    );
  };

  return (
    <>
      <Button
        size="small"
        variant="text"
        startIcon={
          <Badge badgeContent={activeCount} color="primary" anchorOrigin={{ vertical: 'top', horizontal: 'left' }}>
            <TuneIcon sx={{ fontSize: '14px' }} />
          </Badge>
        }
        onClick={handleOpen}
        sx={{
          textDecoration: 'underline',
          textTransform: 'none',
          '&:hover': { textDecoration: 'underline' }
        }}
      >
        {__('Filters', 'bromate-rest-api-firewall')}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCancel}
        PaperProps={{ sx: { minWidth: 300, maxWidth: 380 } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {(() => {
          const BOOL_ORDER = ['embed', 'rendered', 'date_format', 'relative_url', 'remove_uploads_path'];
          const boolFilters = [...localFilters]
            .filter((f) => f.type !== 'search_replace')
            .sort((a, b) => {
              const ai = BOOL_ORDER.indexOf(a.key);
              const bi = BOOL_ORDER.indexOf(b.key);
              if (ai !== -1 && bi !== -1) return ai - bi;
              if (ai !== -1) return -1;
              if (bi !== -1) return 1;
              return a.key.localeCompare(b.key);
            });
          const srFilters = localFilters.filter((f) => f.type === 'search_replace');
          return (
            <>
              {boolFilters.map((f) => renderBooleanFilter(f))}
              {boolFilters.length > 0 && srFilters.length > 0 && (
                <Divider sx={{ my: 0.5 }} />
              )}
              {srFilters.map((f) => renderSearchReplaceFilter(f))}
            </>
          );
        })()}

        <Divider sx={{ mt: 0.5 }} />

        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isInherit && onToggleInherit && (
            <Button
              size="small"
              variant="text"
              sx={{ fontSize: '0.72rem', color: 'text.secondary', textTransform: 'none', mr: 'auto' }}
              onClick={() => { onToggleInherit(); handleCancel(); }}
            >
              {__('Revert to inherited', 'bromate-rest-api-firewall')}
            </Button>
          )}
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="text"
              sx={{ textTransform: 'none' }}
              onClick={handleCancel}
            >
              {__('Cancel', 'bromate-rest-api-firewall')}
            </Button>
            <Button
              size="small"
              variant="contained"
              disableElevation
              disabled={isFormDisabled}
              sx={{ textTransform: 'none' }}
              onClick={handleSave}
            >
              {__('Save', 'bromate-rest-api-firewall')}
            </Button>
          </Box>
        </Box>
      </Menu>
    </>
  );
}

// PropertyRow Component
export function PropertyRow({
  propName,
  propConfig,
  selectedObjectType,
  setField,
  hasValidLicense = true,
  __,
  depth = 0,
  basePath = '',
  alwaysExpanded = false,
  disabled = false,
  isInherit = false,
  onToggleInherit = null,
  globalForm = null,
}: PropertyRowProps) {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [localDisable, setLocalDisable] = useState(propConfig.settings?.disable ?? false);

  const readOnly = (propConfig as any).readonly || false;
  const propContext = (propConfig as any).context || [];
  const argsOptions = (propConfig as any).args_options || [];
  const propType = propConfig.type || '';
  const subProperties = propConfig.properties || {};
  
  const isDisabled =
    propContext.length > 0 &&
    !propContext.includes('view') &&
    !propContext.includes('embed');
    
  const settings = propConfig.settings || { disable: false, filters: [] };
  const isLocked = (settings as any).locked ?? false;
  const isGloballyLocked =
    (propName === '_links' && !!globalForm?.rest_models_remove_links_prop) ||
    (propName === '_embedded' && !!globalForm?.rest_models_remove_embed_prop);
  const effectivelyLocked = isLocked || isGloballyLocked;

  useEffect(() => {
    setLocalDisable(settings.disable ?? false);
  }, [settings.disable]);

  const hasFilters = Array.isArray(settings.filters) && settings.filters.length > 0;

  const hasSubProperties =
    depth < MAX_PROPERTY_DEPTH &&
    subProperties &&
    typeof subProperties === 'object' &&
    !Array.isArray(subProperties) &&
    Object.keys(subProperties).length > 0;

  const typeLabel = Array.isArray(propType) ? propType.join('|') : propType;
  const typeColor = TYPE_COLORS[Array.isArray(propType) ? propType[0] : propType] || 'default';

  const hasDetails = propContext.length > 0 || readOnly || argsOptions.length > 0;

  return (
    <Box
      sx={{
        opacity: isDisabled ? 0.45 : 1,
        '&:hover': { bgcolor: 'action.hover' },
        borderRadius: 0.5,
        pl: 1,
        py: 0.25,
        ...(depth > 0 && {
          ml: 2,
          borderLeft: '2px solid',
          borderColor: 'divider',
          pl: 1.5,
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minHeight: 36,
        }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ minWidth: 0, flex: 1 }}
        >
          {hasSubProperties && !alwaysExpanded ? (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                p: 0.25,
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s',
              }}
            >
              <ExpandMoreIcon fontSize="small" sx={{ fontSize: 18 }} />
            </IconButton>
          ) : (
            <Box sx={{ width: 26, flexShrink: 0 }} />
          )}

          <Stack direction="row" alignItems="center" gap={1}>
            <Typography
              sx={{
                flex: 1,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                fontSize: depth > 0 ? '0.9rem' : '1rem',
              }}
              fontWeight={depth > 0 ? 400 : 500}
            >
              {propName}
            </Typography>
            <CopyButton sx={{ flex: 0 }} toCopy={propName} />
          </Stack>

          {typeLabel && (
            <Chip
              label={typeLabel}
              size="small"
              color={typeColor}
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}

          {hasDetails && (
            <Link
              component="button"
              variant="caption"
              underline="always"
              color="text.secondary"
              onClick={() => setDetailsOpen(!detailsOpen)}
              sx={{ fontSize: '0.7rem' }}
            >
              {__('details', 'bromate-rest-api-firewall')}
            </Link>
          )}
        </Stack>

        {(depth === 0 || 'disable' in settings) && (
          <Stack
            direction="row"
            gap={2}
            alignItems="center"
            justifyContent="flex-end"
          >
            {hasFilters && (
              <FiltersMenu
                filters={settings.filters}
                propName={propName}
                isInherit={isInherit}
                globalForm={globalForm}
                onToggleInherit={onToggleInherit}
                setField={setField}
                basePath={basePath}
                disabled={disabled}
                hasValidLicense={hasValidLicense}
                __={__}
              />
            )}

            <FormControlLabel
              disabled={!hasValidLicense}
              sx={{ marginRight: 0 }}
              control={
                <Switch
                  size="small"
                  checked={localDisable || effectivelyLocked}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setLocalDisable(next);
                    setField({
                      target: {
                        name: `${basePath}.settings.disable`,
                        value: next,
                      },
                    });
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  {__('Disable', 'bromate-rest-api-firewall')}
                </Typography>
              }
            />
          </Stack>
        )}
      </Box>

      <Collapse in={detailsOpen}>
        {propConfig.description && depth === 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              pl: 4.25,
            }}
          >
            {propConfig.description}
          </Typography>
        )}
        <Box
          sx={{
            pl: 4.25,
            pb: 0.75,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
          }}
        >
          {propContext.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {__('context:', 'bromate-rest-api-firewall')} {propContext.join(', ')}
            </Typography>
          )}
          {readOnly && (
            <Chip
              label={__('read-only', 'bromate-rest-api-firewall')}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          )}
          {argsOptions.map((opt: string) => (
            <Chip
              key={opt}
              label={opt}
              size="small"
              variant="outlined"
              color="info"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          ))}
        </Box>
      </Collapse>

      {hasSubProperties && (
        alwaysExpanded ? (
          <Stack spacing={0} sx={{ mt: 0.25, mb: 0.5 }}>
            {Object.entries(subProperties).map(([subName, subConfig]) => (
              <PropertyRow
                key={subName}
                propName={subName}
                propConfig={subConfig}
                selectedObjectType={selectedObjectType}
                setField={setField}
                hasValidLicense={hasValidLicense}
                __={__}
                depth={depth + 1}
                basePath={`${basePath}.properties.${subName}`}
                alwaysExpanded={true}
                disabled={disabled}
                globalForm={globalForm}
              />
            ))}
          </Stack>
        ) : (
          <Collapse in={expanded}>
            <Stack spacing={0} sx={{ mt: 0.25, mb: 0.5 }}>
              {Object.entries(subProperties).map(([subName, subConfig]) => (
                <PropertyRow
                  key={subName}
                  propName={subName}
                  propConfig={subConfig}
                  selectedObjectType={selectedObjectType}
                  setField={setField}
                  hasValidLicense={hasValidLicense}
                  __={__}
                  depth={depth + 1}
                  basePath={`${basePath}.properties.${subName}`}
                  disabled={disabled}
                  globalForm={globalForm}
                />
              ))}
            </Stack>
          </Collapse>
        )
      )}
    </Box>
  );
}

// ModelProperties Component
export function ModelProperties({ selectedObjectType, setField, globalForm }: ModelPropertiesProps) {
  const [fetchedProps, setFetchedProps] = useState<Record<string, ModelProperty> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedObjectType) {
      setFetchedProps(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchedProps(null);

    const fetchProperties = async () => {
      try {
        const response = await apiRequest<{ props: Record<string, ModelProperty> }>(
          'bromate_model_properties',
          { object_type: selectedObjectType }
        );
        
        if (!cancelled) {
          setFetchedProps(response.props || null);
        }
      } catch {
        if (!cancelled) {
          setFetchedProps(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProperties();

    return () => {
      cancelled = true;
    };
  }, [selectedObjectType]);

  if (loading) {
    return (
      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!fetchedProps) {
    return null;
  }

  return (
    <Stack spacing={1}>
      <Stack spacing={0}>
        {Object.entries(fetchedProps).map(([propName, propConfig]) => (
          <PropertyRow
            key={propName}
            propName={propName}
            propConfig={propConfig}
            selectedObjectType={selectedObjectType}
            setField={setField}
            hasValidLicense={true}
            __={__}
            basePath={`postProperties.${selectedObjectType}.props.${propName}`}
            globalForm={globalForm}
          />
        ))}
      </Stack>
    </Stack>
  );
}