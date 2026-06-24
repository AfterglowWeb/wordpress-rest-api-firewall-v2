// components/Authentication.tsx

import { useState, useCallback } from '@wordpress/element';
import {
  Box, Paper, Typography, Switch, Stack,
  TextField, Select, MenuItem, FormControl,
  InputLabel, Divider, Button,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowId,
  Toolbar
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import type { AuthSettings, AuthorizedUser } from '@app-types/auth';
import UserDialog from '@features/authentication/UserDialog';

function CustomToolbar() {
  return (
    <Toolbar>
      <Button startIcon={<AddIcon />} size="small">
        Add user
      </Button>
      <Box sx={{ display: 'flex', gap: 1 }}>
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);

  const update = <K extends keyof AuthSettings>(
    key: K,
    value: AuthSettings[K]
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSaveUser = useCallback((user: AuthorizedUser) => {
    setSettings((prev) => {
      const exists = prev.auth_users.some((u) => u.id === user.id);
      return {
        ...prev,
        auth_users: exists
          ? prev.auth_users.map((u) => (u.id === user.id ? user : u))
          : [...prev.auth_users, user],
      };
    });
    setDialogOpen(false);
    setEditingUser(null);
  }, []);

  const handleDeleteUser = useCallback((id: GridRowId) => {
    setSettings((prev) => ({
      ...prev,
      auth_users: prev.auth_users.filter((u) => u.id !== id),
    }));
  }, []);

  const columns: GridColDef<AuthorizedUser>[] = [
    { field: 'id', headerName: 'WP ID', width: 80 },
    { field: 'display_name', headerName: 'User', flex: 1 },
    { field: 'wp_role', headerName: 'Role', width: 120 },
    {
      field: 'jwt_claim_sub',
      headerName: 'JWT sub claim',
      flex: 1,
      renderCell: ({ value }) => (
        <Typography variant="body2" fontFamily="monospace" color="text.secondary">
          {value ?? '—'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      // Chip via renderCell — à adapter avec ton système de design
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
      getActions: ({ id, row }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => { setEditingUser(row); setDialogOpen(true); }}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Remove"
          onClick={() => handleDeleteUser(id)}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Authentication
      </Typography>

      {/* Core settings — inchangé */}
      <Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="h6" mb={2}>
					Core Settings
				</Typography>

				<Stack spacing={2}>
					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Box>
							<Typography fontWeight={600}>
								Require authentication for all API routes
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Force authentication unless route is explicitly public
							</Typography>
						</Box>

						<Switch
							checked={settings.auth_enforce}
							onChange={(e) =>
								update('auth_enforce', e.target.checked)
							}
						/>
					</Box>

					<FormControl fullWidth>
						<InputLabel>Authentication method</InputLabel>
						<Select
							value={settings.auth_methods}
							label="Authentication method"
							onChange={(e) =>
								update('auth_methods', e.target.value as any)
							}
						>
							<MenuItem value="wp_auth">WordPress Auth</MenuItem>
							<MenuItem value="jwt">JWT</MenuItem>
						</Select>
					</FormControl>
				</Stack>
      </Paper>

      {/* JWT — inchangé */}
      {settings.auth_methods === 'jwt' && (
        <Paper sx={{ p: 2, mb: 2 }}>
					<Typography variant="h6" mb={2}>
						JWT Configuration
					</Typography>

					<Stack spacing={2}>
						<FormControl fullWidth>
							<InputLabel>JWT Algorithm</InputLabel>
							<Select
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

      {/* Multi-user management */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          Authorized users
        </Typography>

        <DataGrid
          rows={settings.auth_users}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 25]}
          slots={{
            toolbar: Toolbar
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      <UserDialog
        open={dialogOpen}
        user={editingUser}
        onSave={handleSaveUser}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}