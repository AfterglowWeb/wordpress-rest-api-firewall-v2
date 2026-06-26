import { useState, useCallback, useMemo } from '@wordpress/element';
import {
  Box, Paper, Typography, Switch, Stack,
  TextField, Select, MenuItem, FormControl,
  InputLabel, Button, Alert, Snackbar, Chip,
  RadioGroup, FormControlLabel, Radio, FormLabel
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowId,
  GridRowSelectionModel,
  Toolbar
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import type { AuthSettings, AuthorizedUser } from '@app-types/auth';
import UserDialog from '@features/authentication/UserDialog';
import { apiRequest } from '@services/api';
import { usePortalContainer } from '@contexts/PortalContainerContext';

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    onAddUser: () => void;
    onDeleteSelected: () => void;
    selectedCount: number;
  }
}

interface CustomToolbarProps {
  onAddUser: () => void;
  onDeleteSelected: () => void;
  selectedCount: number;
}

function CustomToolbar({ onAddUser, onDeleteSelected, selectedCount }: CustomToolbarProps) {
  return (
    <Toolbar>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button 
          startIcon={<AddIcon />} 
          size="small"
          variant="contained"
          onClick={onAddUser}
        >
          Add user
        </Button>
        <Button 
          startIcon={<DeleteForeverIcon />} 
          size="small"
          variant="outlined"
          color="error"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
        >
          Delete selected ({selectedCount})
        </Button>
      </Box>
    </Toolbar>
  );
}

export default function Authentication(): JSX.Element {
  const [settings, setSettings] = useState<AuthSettings>({
    auth_enforce: false,
    auth_methods: 'wp_auth',
    auth_jwt_algorithm: 'RS256',
    auth_jwt_public_key: '',
    auth_jwt_audience: '',
    auth_jwt_issuer: '',
    auth_users: [],
  });

  const portalContainer = usePortalContainer();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set<GridRowId>(),
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [wpUsers, setWpUsers] = useState<AuthorizedUser[]>([]);
  const [wpUsersLoading, setWpUsersLoading] = useState(false);
  const fetchWordPressUsers = useCallback(async () => {
    setWpUsersLoading(true);
    try {
      const users = await apiRequest<AuthorizedUser[]>('bromate_get_authorized_users');
      setWpUsers(users);

    } catch (error) {
      console.error('Failed to fetch WordPress users:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load WordPress users',
        severity: 'error',
      });
    } finally {
      setWpUsersLoading(false);
    }
  }, []);


  const update = <K extends keyof AuthSettings>(
    key: K,
    value: AuthSettings[K]
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSaveUser = useCallback((user: AuthorizedUser) => {
    setSettings((prev) => {
      const exists = prev.auth_users.some((u) => u.id === user.id);
      const newUsers = exists
        ? prev.auth_users.map((u) => (u.id === user.id ? user : u))
        : [...prev.auth_users, user];
      
      setSnackbar({
        open: true,
        message: exists ? 'User updated successfully' : 'User added successfully',
        severity: 'success',
      });
      
      return {
        ...prev,
        auth_users: newUsers,
      };
    });
    setDialogOpen(false);
    setEditingUser(null);
  }, []);

  const handleDeleteUser = useCallback((id: GridRowId) => {
    setSettings((prev) => {
      const user = prev.auth_users.find(u => u.id === id);
      setSnackbar({
        open: true,
        message: `User ${user?.display_name || id} deleted successfully`,
        severity: 'success',
      });
      return {
        ...prev,
        auth_users: prev.auth_users.filter((u) => u.id !== id),
      };
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const selectedIds = Array.from(rowSelectionModel.ids);
    const selectedNames = settings.auth_users
      .filter(u => selectedIds.includes(u.id))
      .map(u => u.display_name)
      .join(', ');
    
    setSettings((prev) => ({
      ...prev,
      auth_users: prev.auth_users.filter((u) => !selectedIds.includes(u.id)),
    }));
    
    setSnackbar({
      open: true,
      message: `Deleted ${selectedIds.length} user(s): ${selectedNames}`,
      severity: 'success',
    });
    
    setRowSelectionModel({
      type: 'include',
      ids: new Set<GridRowId>(),
    });
  }, [rowSelectionModel, settings.auth_users]);

  const handleAddUser = useCallback(() => {
    setEditingUser(null);
    fetchWordPressUsers();
    setDialogOpen(true);
  }, [fetchWordPressUsers]);

  const handleEditUser = useCallback((user: AuthorizedUser) => {
    setEditingUser(user);
    setDialogOpen(true);
  }, []);

  const columns: GridColDef<AuthorizedUser>[] = [
    { field: 'id', headerName: 'WP ID', width: 80 },
    { field: 'display_name', headerName: 'User', flex: 1 },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      valueGetter: (_, row) => row.email || '—',
    },
    { 
      field: 'wp_role', 
      headerName: 'Role', 
      width: 120,
      valueGetter: (_, row) => {
        if (row.roles && row.roles.length > 0) {
          return row.roles[0];
        }
        return row.roles || '—';
      }
    },
    {
      field: 'jwt_claim_sub',
      headerName: 'JWT sub claim',
      flex: 1,
      valueGetter: (_, row) => row.jwt_claim_sub || '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => {
        const statusColors: Record<string, string> = {
          active: '#4caf50',
          expiring: '#ff9800',
          revoked: '#f44336',
        };
        return (
          <Chip 
            label={value || 'active'} 
            size="small"
            sx={{ 
              backgroundColor: statusColors[value as string] || '#9e9e9e',
              color: 'white',
            }}
          />
        );
      }
    },
    {
      field: 'expires_at',
      headerName: 'Expires',
      width: 120,
      valueFormatter: ({ value }) =>
        value ? new Date(value).toLocaleDateString() : '—',
    },
    {
      field: 'actions',
      type: 'actions',
      width: 80,
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEditUser(row)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Remove"
          onClick={() => handleDeleteUser(row.id)}
        />,
      ],
    },
  ];

  const dataGridRows = settings.auth_users;

  const toolbarSlots = useMemo(() => ({
    toolbar: CustomToolbar,
  }), []);

  const toolbarSlotProps = useMemo(() => ({
    toolbar: {
      onAddUser: handleAddUser,
      onDeleteSelected: handleDeleteSelected,
      selectedCount: rowSelectionModel.ids.size,
    },
  }), [handleAddUser, handleDeleteSelected, rowSelectionModel.ids.size]);

  return (
    <Stack flexDirection={"column"} gap={2}>
     
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>
          Core Settings
        </Typography>
        <Stack flexDirection={"column"} gap={2}>
          <FormControl>
            <FormLabel>Authentication method</FormLabel>
            <RadioGroup
              row
              value={settings.auth_methods}
              onChange={(e) => update('auth_methods', e.target.value as any)}
            >
              <FormControlLabel value="wp_auth" control={<Radio size="small" />} label="WordPress Auth" />
              <FormControlLabel value="jwt"     control={<Radio size="small" />} label="JWT" />
            </RadioGroup>
          </FormControl>

          <FormControl>
            <FormLabel>Require authentication for all API routes</FormLabel>
            <Switch
              checked={settings.auth_enforce}
              onChange={(e) =>
                update('auth_enforce', e.target.checked)
              }
            />
          </FormControl>
        </Stack>
      </Paper>

      {settings.auth_methods === 'jwt' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" mb={2}>
            JWT Configuration
          </Typography>

          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>JWT Algorithm</InputLabel>
              <Select
                MenuProps={{container:portalContainer}}
                value={settings.auth_jwt_algorithm}
                label="JWT Algorithm"
                onChange={(e) =>
                  update(
                    'auth_jwt_algorithm',
                    e.target.value as any
                  )
                }
              >
                <MenuItem value="RS256">RS256</MenuItem>
                <MenuItem value="RS384">RS384</MenuItem>
                <MenuItem value="RS512">RS512</MenuItem>
                <MenuItem value="HS256">HS256</MenuItem>
                <MenuItem value="HS384">HS384</MenuItem>
                <MenuItem value="HS512">HS512</MenuItem>
                <MenuItem value="ES256">ES256</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="JWT Public Key"
              multiline
              minRows={4}
              value={settings.auth_jwt_public_key}
              onChange={(e) =>
                update('auth_jwt_public_key', e.target.value)
              }
            />

            <TextField
              label="JWT Audience"
              value={settings.auth_jwt_audience}
              onChange={(e) =>
                update('auth_jwt_audience', e.target.value)
              }
            />

            <TextField
              label="JWT Issuer"
              value={settings.auth_jwt_issuer}
              onChange={(e) =>
                update('auth_jwt_issuer', e.target.value)
              }
            />
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          Authorized users
        </Typography>

        <DataGrid
          rows={dataGridRows}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 25]}
          showToolbar={true}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(newSelection) => {
            setRowSelectionModel(newSelection);
          }}
          slots={toolbarSlots}
          slotProps={toolbarSlotProps}

        />
      </Paper>

      <UserDialog
        open={dialogOpen}
        user={editingUser}
        onSave={handleSaveUser}
        onClose={() => setDialogOpen(false)}
        wpUsers={wpUsers}
        wpUsersLoading={wpUsersLoading}
        fetchWordPressUsers={fetchWordPressUsers}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}