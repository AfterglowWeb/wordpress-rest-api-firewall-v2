import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SettingsAPI } from '@services/settings';
import { apiRequest } from '@services/api';

import {
  Paper,
  Stack,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Snackbar,
  Divider,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';

import { useDialog, DIALOG_TYPES } from '@contexts/DialogContext';
import ConfirmDialog from '@components/ConfirmDialog';
import { usePortalContainer } from '@contexts/PortalContainerContext';

interface LoginSettings {
  login_rate_limit_enabled: boolean;
  login_rate_limit_attempts: number;
  login_rate_limit_window: number;
  login_rate_limit_blacklist_time: number;
  login_rate_limit_promote_after: number;
  
  // reCAPTCHA
  login_recaptcha_enabled: boolean;
  login_recaptcha_site_key: string;
  login_recaptcha_secret_key: string;
  login_recaptcha_threshold: number;
  
  // 2FA
  login_2fa_enabled: boolean;
  login_2fa_methods: string[];
  login_2fa_issuer: string;
  login_2fa_algorithm: string;
  login_2fa_digits: number;
  login_2fa_period: number;
}

interface BlockedIp {
  id: number;
  ip: string;
  blocked_until: string;
  reason: string;
  attempts: number;
}

const DEFAULT_SETTINGS: LoginSettings = {
  login_rate_limit_enabled: false,
  login_rate_limit_attempts: 5,
  login_rate_limit_window: 300,
  login_rate_limit_blacklist_time: 3600,
  login_rate_limit_promote_after: 0,
  
  login_recaptcha_enabled: false,
  login_recaptcha_site_key: '',
  login_recaptcha_secret_key: '',
  login_recaptcha_threshold: 0.5,
  
  login_2fa_enabled: false,
  login_2fa_methods: ['totp'],
  login_2fa_issuer: 'Bromate REST API',
  login_2fa_algorithm: 'SHA1',
  login_2fa_digits: 6,
  login_2fa_period: 30,
};

export default function LoginHardening(): JSX.Element {
  const portalContainer = usePortalContainer();
  const { openDialog } = useDialog();
  
  const [settings, setSettings] = useState<LoginSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loadingIps, setLoadingIps] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await SettingsAPI.readOptions();
        // Merge with defaults
        const loadedSettings = { ...DEFAULT_SETTINGS };
        Object.keys(loadedSettings).forEach((key) => {
          if (key in response) {
            (loadedSettings as any)[key] = response[key];
          }
        });
        setSettings(loadedSettings);
        setError(null);
      } catch (err) {
        setError(__('Failed to load login settings.', 'bromate-rest-api-firewall'));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Load blocked IPs
  useEffect(() => {
    const loadBlockedIps = async () => {
      setLoadingIps(true);
      try {
        const response = await apiRequest<{ entries: BlockedIp[] }>(
          'bromate_get_blocked_ips'
        );
        setBlockedIps(response.entries || []);
      } catch (err) {
        // Silent fail for IP list
      } finally {
        setLoadingIps(false);
      }
    };

    if (settings.login_rate_limit_enabled) {
      loadBlockedIps();
    }
  }, [settings.login_rate_limit_enabled]);

  const updateSetting = <K extends keyof LoginSettings>(
    key: K,
    value: LoginSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save all settings
      await SettingsAPI.updateOptions(settings);
      setSuccess(__('Settings saved successfully.', 'bromate-rest-api-firewall'));
    } catch (err) {
      setError(__('Failed to save settings.', 'bromate-rest-api-firewall'));
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleUnblockIp = useCallback((id: number) => {
    openDialog({
      type: DIALOG_TYPES.CONFIRM,
      title: __('Unblock IP', 'bromate-rest-api-firewall'),
      content: __('Are you sure you want to unblock this IP address?', 'bromate-rest-api-firewall'),
      confirmLabel: __('Unblock', 'bromate-rest-api-firewall'),
      onConfirm: async () => {
        try {
          await apiRequest('bromate_unblock_ip', { id });
          setBlockedIps((prev) => prev.filter((ip) => ip.id !== id));
          setSuccess(__('IP unblocked successfully.', 'bromate-rest-api-firewall'));
        } catch (err) {
          setError(__('Failed to unblock IP.', 'bromate-rest-api-firewall'));
        }
      },
    });
  }, [openDialog]);

  const handleBulkUnblock = useCallback(() => {
    const selectedIds = Array.from((rowSelectionModel as any).ids || []);
    if (!selectedIds.length) return;

    openDialog({
      type: DIALOG_TYPES.CONFIRM,
      title: __('Unblock IPs', 'bromate-rest-api-firewall'),
      content: `${__('Unblock', 'bromate-rest-api-firewall')} ${selectedIds.length} ${__('IP addresses?', 'bromate-rest-api-firewall')}`,
      confirmLabel: __('Unblock All', 'bromate-rest-api-firewall'),
      onConfirm: async () => {
        try {
          await apiRequest('bromate_unblock_ips', { ids: JSON.stringify(selectedIds) });
          setBlockedIps((prev) => prev.filter((ip) => !selectedIds.includes(ip.id)));
          setRowSelectionModel({ type: 'include', ids: new Set() });
          setSuccess(__('IPs unblocked successfully.', 'bromate-rest-api-firewall'));
        } catch (err) {
          setError(__('Failed to unblock IPs.', 'bromate-rest-api-firewall'));
        }
      },
    });
  }, [rowSelectionModel, openDialog]);

  const columns: GridColDef<BlockedIp>[] = [
    {
      field: 'ip',
      headerName: __('IP Address', 'bromate-rest-api-firewall'),
      flex: 1,
      minWidth: 130,
      renderCell: ({ value }) => (
        <Chip label={value} size="small" sx={{ fontFamily: 'monospace' }} />
      ),
    },
    {
      field: 'attempts',
      headerName: __('Attempts', 'bromate-rest-api-firewall'),
      width: 100,
    },
    {
      field: 'blocked_until',
      headerName: __('Blocked Until', 'bromate-rest-api-firewall'),
      width: 180,
      valueFormatter: (value: string) => {
        if (!value) return '—';
        const date = new Date(value);
        return date.toLocaleString();
      },
    },
    {
      field: 'reason',
      headerName: __('Reason', 'bromate-rest-api-firewall'),
      flex: 1,
    },
    {
      field: 'actions',
      type: 'actions',
      width: 80,
      getActions: ({ row }) => [
        <Tooltip key="unblock" title={__('Unblock IP', 'bromate-rest-api-firewall')}>
          <DeleteIcon
            sx={{ cursor: 'pointer', color: 'error.main' }}
            onClick={() => handleUnblockIp(row.id)}
          />
        </Tooltip>,
      ],
    },
  ];

  if (loading) {
    return (
      <Stack spacing={3} p={2}>
        <Paper sx={{ p: 2 }} elevation={0}>
          <Typography>Loading...</Typography>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} p={2}>
      {/* Rate Limiting Section */}
      <Paper sx={{ p: 2 }} elevation={0}>
        <Stack flexDirection="column" gap={2}>
          <FormControlLabel
            label={__('Enable Login Rate Limiting', 'bromate-rest-api-firewall')}
            control={
              <Switch
                checked={settings.login_rate_limit_enabled}
                onChange={(e) =>
                  updateSetting('login_rate_limit_enabled', e.target.checked)
                }
              />
            }
          />

          <Stack>
            <Typography variant="h6" mb={2}>
              {__('Rate Limiting Settings', 'bromate-rest-api-firewall')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-start">
              <TextField
                label={__('Max Attempts', 'bromate-rest-api-firewall')}
                type="number"
                size="small"
                value={settings.login_rate_limit_attempts}
                onChange={(e) =>
                  updateSetting('login_rate_limit_attempts', Number(e.target.value))
                }
                disabled={!settings.login_rate_limit_enabled}
                helperText={__('Number of failed attempts before blocking', 'bromate-rest-api-firewall')}
                sx={{ minWidth: 150 }}
              />
              <TextField
                label={__('Time Window (seconds)', 'bromate-rest-api-firewall')}
                type="number"
                size="small"
                value={settings.login_rate_limit_window}
                onChange={(e) =>
                  updateSetting('login_rate_limit_window', Number(e.target.value))
                }
                disabled={!settings.login_rate_limit_enabled}
                helperText={__('Time window for counting attempts', 'bromate-rest-api-firewall')}
                sx={{ minWidth: 150 }}
              />
              <TextField
                label={__('Block Duration (seconds)', 'bromate-rest-api-firewall')}
                type="number"
                size="small"
                value={settings.login_rate_limit_blacklist_time}
                onChange={(e) =>
                  updateSetting('login_rate_limit_blacklist_time', Number(e.target.value))
                }
                disabled={!settings.login_rate_limit_enabled}
                helperText={__('How long to block the IP', 'bromate-rest-api-firewall')}
                sx={{ minWidth: 150 }}
              />
              <TextField
                label={__('Promote After (blocks)', 'bromate-rest-api-firewall')}
                type="number"
                size="small"
                value={settings.login_rate_limit_promote_after}
                onChange={(e) =>
                  updateSetting('login_rate_limit_promote_after', Number(e.target.value))
                }
                disabled={!settings.login_rate_limit_enabled}
                helperText={__('0 = never promote to global blacklist', 'bromate-rest-api-firewall')}
                sx={{ minWidth: 150 }}
              />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* Blocked IPs Section */}
      {settings.login_rate_limit_enabled && (
        <Paper sx={{ p: 2 }} elevation={0}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              {__('Blocked IPs', 'bromate-rest-api-firewall')}
            </Typography>
            {(rowSelectionModel as any).ids?.size > 0 && (
              <Button
                size="small"
                color="error"
                variant="contained"
                disableElevation
                startIcon={<DeleteIcon />}
                onClick={handleBulkUnblock}
              >
                {__('Unblock Selected', 'bromate-rest-api-firewall')} ({(rowSelectionModel as any).ids.size})
              </Button>
            )}
          </Stack>
          <DataGrid
            rows={blockedIps}
            columns={columns}
            loading={loadingIps}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            getRowId={(row) => row.id}
            sx={{
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
              },
            }}
          />
        </Paper>
      )}

      <Divider />

      {/* reCAPTCHA Section */}
      <Paper sx={{ p: 2 }} elevation={0}>
        <Stack flexDirection="column" gap={2}>
          <FormControlLabel
            label={
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography>{__('Enable reCAPTCHA', 'bromate-rest-api-firewall')}</Typography>
                <Tooltip title={__('Google reCAPTCHA v3 protection for login', 'bromate-rest-api-firewall')}>
                  <InfoIcon fontSize="small" color="info" />
                </Tooltip>
              </Stack>
            }
            control={
              <Switch
                checked={settings.login_recaptcha_enabled}
                onChange={(e) =>
                  updateSetting('login_recaptcha_enabled', e.target.checked)
                }
              />
            }
          />

          <Stack spacing={2}>
            <TextField
              label={__('Site Key', 'bromate-rest-api-firewall')}
              size="small"
              value={settings.login_recaptcha_site_key}
              onChange={(e) =>
                updateSetting('login_recaptcha_site_key', e.target.value)
              }
              disabled={!settings.login_recaptcha_enabled}
              helperText={__('reCAPTCHA v3 site key from Google', 'bromate-rest-api-firewall')}
            />
            <TextField
              label={__('Secret Key', 'bromate-rest-api-firewall')}
              size="small"
              type="password"
              value={settings.login_recaptcha_secret_key}
              onChange={(e) =>
                updateSetting('login_recaptcha_secret_key', e.target.value)
              }
              disabled={!settings.login_recaptcha_enabled}
              helperText={__('reCAPTCHA v3 secret key from Google', 'bromate-rest-api-firewall')}
            />
            <TextField
              label={__('Score Threshold', 'bromate-rest-api-firewall')}
              type="number"
              size="small"
              inputProps={{ min: 0, max: 1, step: 0.1 }}
              value={settings.login_recaptcha_threshold}
              onChange={(e) =>
                updateSetting('login_recaptcha_threshold', Number(e.target.value))
              }
              disabled={!settings.login_recaptcha_enabled}
              helperText={__('Minimum score (0.0 - 1.0) to pass verification', 'bromate-rest-api-firewall')}
              sx={{ maxWidth: 200 }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Divider />

      {/* 2FA Section */}
      <Paper sx={{ p: 2 }} elevation={0}>
        <Stack flexDirection="column" gap={2}>
          <FormControlLabel
            label={
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography>{__('Enable Two-Factor Authentication', 'bromate-rest-api-firewall')}</Typography>
                <Tooltip title={__('TOTP-based 2FA for login', 'bromate-rest-api-firewall')}>
                  <InfoIcon fontSize="small" color="info" />
                </Tooltip>
              </Stack>
            }
            control={
              <Switch
                checked={settings.login_2fa_enabled}
                onChange={(e) =>
                  updateSetting('login_2fa_enabled', e.target.checked)
                }
              />
            }
          />

          <Stack spacing={2}>
            <TextField
              label={__('Issuer', 'bromate-rest-api-firewall')}
              size="small"
              value={settings.login_2fa_issuer}
              onChange={(e) =>
                updateSetting('login_2fa_issuer', e.target.value)
              }
              disabled={!settings.login_2fa_enabled}
              helperText={__('Organization name shown in authenticator apps', 'bromate-rest-api-firewall')}
            />

            <FormControl size="small" disabled={!settings.login_2fa_enabled}>
              <InputLabel>{__('Algorithm', 'bromate-rest-api-firewall')}</InputLabel>
              <Select
                MenuProps={{ container: portalContainer }}
                value={settings.login_2fa_algorithm}
                label={__('Algorithm', 'bromate-rest-api-firewall')}
                onChange={(e) =>
                  updateSetting('login_2fa_algorithm', e.target.value)
                }
              >
                <MenuItem value="SHA1">SHA1</MenuItem>
                <MenuItem value="SHA256">SHA256</MenuItem>
                <MenuItem value="SHA512">SHA512</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" flexWrap="wrap" gap={2}>
              <TextField
                label={__('Digits', 'bromate-rest-api-firewall')}
                type="number"
                size="small"
                inputProps={{ min: 6, max: 8 }}
                value={settings.login_2fa_digits}
                onChange={(e) =>
                  updateSetting('login_2fa_digits', Number(e.target.value))
                }
                disabled={!settings.login_2fa_enabled}
                helperText={__('6 or 8 digits', 'bromate-rest-api-firewall')}
                sx={{ maxWidth: 120 }}
              />
              <TextField
                label={__('Period (seconds)', 'bromate-rest-api-firewall')}
                type="number"
                size="small"
                inputProps={{ min: 15, max: 60 }}
                value={settings.login_2fa_period}
                onChange={(e) =>
                  updateSetting('login_2fa_period', Number(e.target.value))
                }
                disabled={!settings.login_2fa_enabled}
                helperText={__('Token validity period', 'bromate-rest-api-firewall')}
                sx={{ maxWidth: 150 }}
              />
            </Stack>

            <Box>
              <Typography variant="caption" color="text.secondary">
                {__('Supported 2FA methods:', 'bromate-rest-api-firewall')}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
                {settings.login_2fa_methods.map((method) => (
                  <Chip
                    key={method}
                    label={method.toUpperCase()}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
                <Chip
                  label="+ TOTP"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* Save Button */}
      <Paper sx={{ p: 2 }} elevation={0}>
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            disableElevation
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? __('Saving...', 'bromate-rest-api-firewall') : __('Save Settings', 'bromate-rest-api-firewall')}
          </Button>
        </Stack>
      </Paper>

      {/* Notifications */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSuccess(null)}
          severity="success"
          variant="filled"
        >
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          variant="filled"
        >
          {error}
        </Alert>
      </Snackbar>

      <ConfirmDialog />
    </Stack>
  );
}