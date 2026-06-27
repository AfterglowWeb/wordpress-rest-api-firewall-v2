import { useState, useCallback, useMemo, useEffect } from '@wordpress/element';
import {
  Paper, Typography, Switch, Stack,
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
  Toolbar,
  useGridApiContext,
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import type { AuthSettings, AuthorizedUser, AuthorizedUserMeta } from '@app-types/auth';
import UserDialog from '@features/authentication/UserDialog';
import { apiRequest } from '@services/api';
import { SettingsAPI } from '@services/settings';
import { usePortalContainer } from '@contexts/PortalContainerContext';
import ConfirmDialog from '@components/ConfirmDialog';

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    onAddUser: () => void;
    onDeleteSelected: (rows: Map<GridRowId, AuthorizedUser>) => void; // ← updated
    selectedCount: number;
  }
}

interface CustomToolbarProps {
  onAddUser: () => void;
  onDeleteSelected: (rows: Map<GridRowId, AuthorizedUser>) => void; // ← typed, accepts rows
  selectedCount: number;
}

function CustomToolbar({ onAddUser, onDeleteSelected }: CustomToolbarProps) {
  const apiRef = useGridApiContext();
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Map<GridRowId, AuthorizedUser>>(new Map()); // ← typed

  useEffect(() => {
    const update = () => {
      const rows = apiRef.current.getSelectedRows() as Map<GridRowId, AuthorizedUser>;
      setSelectedCount(rows.size);
      setSelectedRows(rows); // ← store the map
    };

    update();
    return apiRef.current.subscribeEvent('rowSelectionChange', update);
  }, [apiRef]);

  return (
    <Toolbar>
      <Button onClick={onAddUser}>Add user</Button>
      <Button
        color="error"
        disabled={selectedCount === 0}
        onClick={() => onDeleteSelected(selectedRows)} // ← pass the map
      >
        Delete ({selectedCount})
      </Button>
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
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [wpUsers, setWpUsers] = useState<AuthorizedUser[]>([]);
  const [wpUsersLoading, setWpUsersLoading] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set<GridRowId>(),
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const authorizedUsers = useMemo<AuthorizedUser[]>(
    () => settings.auth_users
      .flatMap((meta) => {
        const wpUser = wpUsers.find((u) => u.id === meta.id);
        if (!wpUser) return [];
        return [{
          ...wpUser,
          jwt_claim_sub: meta.jwt_claim_sub,
          status:        meta.status,
          expires_at:    meta.expires_at,
        }];
      }),
    [settings.auth_users, wpUsers]
  );

  const authorizedUserIds = useMemo(
    () => settings.auth_users.map((u) => u.id),
    [settings.auth_users]
  );

  const resolveDisplayStatus = (user: AuthorizedUser): 'active' | 'expiring' | 'revoked' => {
    if (user.status === 'revoked') return 'revoked';
    if (user.expires_at) {
      const daysUntilExpiry = Math.ceil(
        (new Date(user.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) return 'expiring';
      if (daysUntilExpiry <= 0) return 'revoked';
    }
    return 'active';
  };

  const fetchWordPressUsers = useCallback(async () => {
    setWpUsersLoading(true);
    try {
      const users = await apiRequest<AuthorizedUser[]>('bromate_authorized_users_options');
      setWpUsers(users);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load WordPress users', severity: 'error' });
    } finally {
      setWpUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      SettingsAPI.readOptions(),
      fetchWordPressUsers(),
    ])
      .then(([options]) => {
        const users = options['auth_users'];
        if (Array.isArray(users)) {
          const valid = users.filter(
            (u): u is AuthorizedUserMeta =>
              u !== null && typeof u === 'object' && typeof u.id === 'number'
          );
          setSettings((prev) => ({ ...prev, auth_users: valid }));
        }
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Failed to load settings', severity: 'error' });
      });
  }, []);

  const update = <K extends keyof AuthSettings>(key: K, value: AuthSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const persistUsers = useCallback((users: AuthorizedUserMeta[]) => {
    SettingsAPI.updateOption('auth_users', users).catch(() =>
      setSnackbar({ open: true, message: 'Failed to save changes', severity: 'error' })
    );
  }, []);

  const handleSaveUser = useCallback((user: AuthorizedUser) => {
    const meta: AuthorizedUserMeta = {
      id: user.id,
      jwt_claim_sub: user.jwt_claim_sub ?? '',
      status: user.status ?? 'active',
      expires_at: user.expires_at ?? '',
    };

    setSettings((prev) => {
      const exists = prev.auth_users.some((u) => u.id === meta.id);
      const newUsers = exists
        ? prev.auth_users.map((u) => (u.id === meta.id ? meta : u))
        : [...prev.auth_users, meta];

      persistUsers(newUsers);
      setSnackbar({
        open: true,
        message: exists ? 'User updated successfully' : 'User added successfully',
        severity: 'success',
      });

      return { ...prev, auth_users: newUsers };
    });

    setDialogOpen(false);
    setEditingUser(null);
  }, [persistUsers]);

  const handleDeleteUser = useCallback((id: GridRowId) => {
    setSettings((prev) => {
      const newUsers = prev.auth_users.filter((u) => u.id !== id);
      persistUsers(newUsers);
      setSnackbar({ open: true, message: 'User removed', severity: 'success' });
      return { ...prev, auth_users: newUsers };
    });
  }, [persistUsers]);

  const handleDeleteSelected = useCallback(() => {
    const selectedIds = Array.from(rowSelectionModel.ids) as number[];
    const selectedNames = authorizedUsers
      .filter((u) => selectedIds.includes(u.id))
      .map((u) => u.display_name)
      .join(', ');

    setSettings((prev) => {
      const newUsers = prev.auth_users.filter((u) => !selectedIds.includes(u.id));
      persistUsers(newUsers);
      return { ...prev, auth_users: newUsers };
    });

    setSnackbar({
      open: true,
      message: `Removed ${selectedIds.length} user(s): ${selectedNames}`,
      severity: 'success',
    });
    setRowSelectionModel({ type: 'include', ids: new Set<GridRowId>() });
  }, [rowSelectionModel, authorizedUsers, persistUsers]);

  const handleAddUser = useCallback(() => {
    setEditingUser(null);
    setDialogOpen(true);
  }, []);

  const handleEditUser = useCallback((user: AuthorizedUser) => {
    setEditingUser(user);
    setDialogOpen(true);
  }, []);

  const toolbarSlots = useMemo(() => ({ toolbar: CustomToolbar }), []);
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
      valueGetter: (_, row) =>
        row.roles && row.roles.length > 0 ? row.roles[0] : '—',
    },
    {
      field: 'wp_role', headerName: 'Role', width: 120,
      valueGetter: (_, row) => row.roles?.length > 0 ? row.roles[0] : '—'
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ row }) => {
        const displayStatus = resolveDisplayStatus(row);
        const statusColors: Record<string, string> = {
          active:   '#4caf50',
          expiring: '#ff9800',
          revoked:  '#f44336',
        };
        return (
          <Chip
            label={displayStatus}
            size="small"
            sx={{ backgroundColor: statusColors[displayStatus], color: 'white' }}
          />
        );
      },
    },
    {
      field: 'expires_at', headerName: 'Expires', width: 120,
      valueFormatter: (value: string | undefined) =>
        value ? new Date(value).toLocaleDateString() : '—'
    },
    {
      field: 'expires_at',
      headerName: 'Expires',
      width: 120,
      valueFormatter: (value: string | undefined) =>
        value ? new Date(value).toLocaleDateString() : '—',
    },
    {
      field: 'actions', type: 'actions', width: 80,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => handleEditUser(row)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Remove" onClick={() => handleDeleteUser(row.id)} />,
      ],
    },
  ];

  const toolbarSlots     = useMemo(() => ({ toolbar: CustomToolbar }), []);
  const toolbarSlotProps = useMemo(() => ({
    toolbar: {
      onAddUser: handleAddUser,
      onDeleteSelected: handleDeleteSelected,
      selectedCount: selectedIds.length,  // ← plain array length, always fresh
    },
  };

  return (
    <Stack flexDirection="column" gap={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>Core Settings</Typography>
        <Stack flexDirection="column" gap={2}>
          <FormControl>
            <FormLabel>Authentication method</FormLabel>
            <RadioGroup row value={settings.auth_methods}
              onChange={(e) => update('auth_methods', e.target.value as any)}>
              <FormControlLabel value="wp_auth" control={<Radio size="small" />} label="WordPress Auth" />
              <FormControlLabel value="jwt" control={<Radio size="small" />} label="JWT" />
            </RadioGroup>
          </FormControl>
          <FormControl>
            <FormLabel>Require authentication for all API routes</FormLabel>
            <Switch
              checked={settings.auth_enforce}
              onChange={(e) => update('auth_enforce', e.target.checked)}
            />
          </FormControl>
        </Stack>
      </Paper>

      {settings.auth_methods === 'jwt' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" mb={2}>JWT Configuration</Typography>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>JWT Algorithm</InputLabel>
              <Select
                MenuProps={{ container: portalContainer }}
                value={settings.auth_jwt_algorithm}
                label="JWT Algorithm"
                onChange={(e) => update('auth_jwt_algorithm', e.target.value as any)}
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
            <TextField label="JWT Public Key" multiline minRows={4}
              value={settings.auth_jwt_public_key}
              onChange={(e) => update('auth_jwt_public_key', e.target.value)} />
            <TextField label="JWT Audience"
              value={settings.auth_jwt_audience}
              onChange={(e) => update('auth_jwt_audience', e.target.value)} />
            <TextField label="JWT Issuer"
              value={settings.auth_jwt_issuer}
              onChange={(e) => update('auth_jwt_issuer', e.target.value)} />
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Authorized users</Typography>
        <DataGrid
          rows={authorizedUsers}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 25]}
          showToolbar
          checkboxSelection
          disableRowSelectionOnClick
          loading={wpUsersLoading}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={setRowSelectionModel}
          slots={toolbarSlots}
          slotProps={{
    toolbar: {
        onAddUser: handleAddUser,
        onDeleteSelected: handleDeleteSelected,
    },
}}
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
        authorizedUserIds={authorizedUserIds}
      />

      <ConfirmDialog />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}