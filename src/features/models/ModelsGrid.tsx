import { useState, useCallback, useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useDialog, DIALOG_TYPES } from '@contexts/DialogContext';
import ConfirmDialog from '@components/ConfirmDialog';

import { DataGrid, GridRowSelectionModel } from '@mui/x-data-grid';

import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';

import { useModels } from '@hooks/useModels';
import { apiRequest } from '@services/api';

import type { ModelEntry } from '@app-types/models';
import ModelEditor from './ModelEditor';

interface ModelsGridProps {
  onEditingChange: (isEditing: boolean) => void;
}

interface WpObject {
  value: string;
  label: string;
  type: 'post_type' | 'taxonomy';
  public: boolean;
  _builtin: boolean;
  source?: string;
}

// Extended model entry with object label and type info
interface ModelRow extends ModelEntry {
  object_label: string;
  object_type_label: string;
}

export default function ModelsGrid({ onEditingChange }: ModelsGridProps) {
  const { openDialog } = useDialog();
  const {
    models,
    loading,
    toggleModel,
    deleteModel,
    deleteModels,
  } = useModels();

  const [editing, setEditing] = useState<ModelEntry | null>(null);
  const [objectTypes, setObjectTypes] = useState<WpObject[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [pendingToggle, setPendingToggle] = useState<{ id: number; enabled: boolean; title: string } | null>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

  // Fetch object types on mount
  useEffect(() => {
    const fetchObjectTypes = async () => {
      try {
        const response = await apiRequest<WpObject[]>('bromate_wordpress_objects_options');
        setObjectTypes(response || []);
      } catch (error) {
        // Handle error silently
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchObjectTypes();
  }, []);

  const setEditingAndNotify = useCallback((model: ModelEntry | null) => {
    setEditing(model);
    onEditingChange(model !== null);
  }, [onEditingChange]);

  const handleDeleteOne = useCallback((id: number, label: string) => {
    openDialog({
      type: DIALOG_TYPES.CONFIRM,
      title: __('Delete Model', 'rest-api-firewall'),
      content: `${__('Permanently delete', 'rest-api-firewall')} "${label}"? ${__('This action cannot be undone.', 'rest-api-firewall')}`,
      confirmLabel: __('Delete', 'rest-api-firewall'),
      onConfirm: () => deleteModel(id),
    });
  }, [openDialog, deleteModel, __]);

  const handleToggle = useCallback(async (id: number, enabled: boolean) => {
    await toggleModel(id, enabled);
  }, [toggleModel]);

  const handleCreateModel = useCallback((objectType: string) => {
    setEditingAndNotify({
      id: null,
      title: '',
      description: '',
      object_type: objectType,
      is_custom: false,
      enabled: false,
      properties: {},
    });
  }, [setEditingAndNotify]);

  const handleCreateSettingsModel = useCallback(() => {
    setEditingAndNotify({
      id: null,
      title: '',
      description: '',
      object_type: 'settings_route',
      is_custom: false,
      enabled: false,
      properties: {},
    });
  }, [setEditingAndNotify]);

  // Helper to convert GridRowSelectionModel to our format
  const handleRowSelectionChange = useCallback((newSelection: GridRowSelectionModel) => {
    if (Array.isArray(newSelection)) {
      setRowSelectionModel({
        type: 'include',
        ids: new Set(newSelection as number[]),
      } as GridRowSelectionModel);
    } else if (newSelection && typeof newSelection === 'object' && 'ids' in newSelection) {
      setRowSelectionModel(newSelection as GridRowSelectionModel);
    } else {
      setRowSelectionModel({ type: 'include', ids: new Set() } as GridRowSelectionModel);
    }
  }, []);

  // Build rows: combine WordPress objects with existing models
  const rows = useMemo((): ModelRow[] => {
    // Create a map of existing models by object_type
    const modelMap = new Map<string, ModelEntry>();
    models.forEach((model) => {
      if (model.object_type) {
        modelMap.set(model.object_type, model);
      }
    });

    // Build rows for all WordPress objects
    const objectRows: ModelRow[] = objectTypes.map((obj) => {
      const existingModel = modelMap.get(obj.value);
      
      return {
        id: existingModel?.id ?? null,
        title: existingModel?.title || '',
        description: existingModel?.description || '',
        object_type: obj.value,
        object_label: obj.label,
        object_type_label: obj.type === 'post_type' ? 'Post Type' : 'Taxonomy',
        is_custom: existingModel?.is_custom || false,
        enabled: existingModel?.enabled || false,
        properties: existingModel?.properties || {},
        author_name: existingModel?.author_name || '',
        date_created: existingModel?.date_created || '',
        date_modified: existingModel?.date_modified || '',
      };
    });

    // Add author object
    const authorModel = modelMap.get('author');
    const authorRow: ModelRow = {
      id: authorModel?.id ?? null,
      title: authorModel?.title || '',
      description: authorModel?.description || '',
      object_type: 'author',
      object_label: 'Author',
      object_type_label: 'User',
      is_custom: authorModel?.is_custom || false,
      enabled: authorModel?.enabled || false,
      properties: authorModel?.properties || {},
      author_name: authorModel?.author_name || '',
      date_created: authorModel?.date_created || '',
      date_modified: authorModel?.date_modified || '',
    };
    objectRows.push(authorRow);

    return objectRows;
  }, [objectTypes, models]);

  if (editing !== null) {
    return (
      <ModelEditor
        model={editing}
        onBack={() => {
          setEditingAndNotify(null);
        }}
      />
    );
  }

  const columns = [
    {
      field: '_actions',
      headerName: __('Actions', 'rest-api-firewall'),
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => {
        const row = params.row as ModelRow;
        const hasModel = row.id !== null;
        
        return (
          <Stack direction="row" alignItems="center" gap={0.5}>
            {hasModel ? (
              <>
                <Switch
                  size="small"
                  checked={!!row.enabled}
                  onChange={() => setPendingToggle({
                    id: row.id!,
                    enabled: !row.enabled,
                    title: row.title || row.object_label,
                  })}
                />
                <IconButton
                  size="small"
                  color="default"
                  onClick={() => handleDeleteOne(row.id!, row.title || row.object_label)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleCreateModel(row.object_type)}
                sx={{ textTransform: 'none' }}
              >
                {__('Create Model', 'rest-api-firewall')}
              </Button>
            )}
          </Stack>
        );
      },
    },
    {
      field: 'enabled',
      headerName: __('Active', 'rest-api-firewall'),
      width: 100,
      renderCell: (params: any) => {
        const row = params.row as ModelRow;
        if (row.id === null) {
          return (
            <Chip
              label={__('No Model', 'rest-api-firewall')}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          );
        }
        return params.value ? (
          <Chip
            label={__('Active', 'rest-api-firewall')}
            size="small"
            color="success"
            variant="outlined"
          />
        ) : (
          <Chip
            label={__('Inactive', 'rest-api-firewall')}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'title',
      headerName: __('Model Name', 'rest-api-firewall'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: any) => {
        const row = params.row as ModelRow;
        if (row.id === null) {
          return (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {__('No model created yet', 'rest-api-firewall')}
            </Typography>
          );
        }
        return (
          <Box
            component="a"
            href="#"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'monospace',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
            onClick={(e) => { 
              e.preventDefault(); 
              // Find the full model entry
              const fullModel = models.find(m => m.id === row.id);
              if (fullModel) {
                setEditingAndNotify(fullModel);
              }
            }}
          >
            {params.value || row.object_label}
            <OpenInNewIcon sx={{ fontSize: 13, color: 'primary.main' }} />
          </Box>
        );
      },
    },
    {
      field: 'object_label',
      headerName: __('Object Type', 'rest-api-firewall'),
      width: 180,
      renderCell: (params: any) => {
        const row = params.row as ModelRow;
        return (
          <Stack direction="row" alignItems="center" gap={1}>
            <Chip
              label={row.object_type}
              size="small"
              variant="outlined"
              sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}
            />
            <Chip
              label={row.object_type_label}
              size="small"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          </Stack>
        );
      },
    },
    {
      field: 'is_custom',
      headerName: __('Schema Type', 'rest-api-firewall'),
      width: 120,
      renderCell: (params: any) => {
        const row = params.row as ModelRow;
        if (row.id === null) {
          return <Typography variant="caption" color="text.secondary">—</Typography>;
        }
        return (
          <Chip
            label={
              row.is_custom
                ? __('Custom', 'rest-api-firewall')
                : __('WP Schema', 'rest-api-firewall')
            }
            size="small"
            sx={{ fontSize: '0.7rem' }}
          />
        );
      },
    },
    {
      field: 'date_created',
      headerName: __('Date Created', 'rest-api-firewall'),
      width: 150,
      renderCell: (params: any) => params.value || '-',
    },
    {
      field: 'date_modified',
      headerName: __('Date Modified', 'rest-api-firewall'),
      width: 150,
      renderCell: (params: any) => params.value || '-',
    },
  ];

  const selectedCount = rowSelectionModel.ids.size;

  if (loadingTypes) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ height: '100%', flexGrow: 1 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        checkboxSelection
        disableRowSelectionOnClick
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={handleRowSelectionChange}
        getRowHeight={() => 'auto'}
        showToolbar
        getRowId={(row) => row.object_type} // Use object_type as ID since it's unique
        sx={{
          '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-row': {
            '&.Mui-selected': {
              backgroundColor: 'action.selected',
            },
          },
        }}
      />

      <ConfirmDialog />
    </Stack>
  );
}