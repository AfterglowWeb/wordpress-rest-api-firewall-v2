import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SettingsAPI } from '@services/settings';
import { useNavigation } from '@contexts/NavigationContext';

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
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

import { useDialog, DIALOG_TYPES } from '@contexts/DialogContext';
import ConfirmDialog from '@components/ConfirmDialog';
import { usePortalContainer } from '@contexts/PortalContainerContext';

interface LoginSettings {
  login_rate_limit_enabled: boolean;
  login_rate_limit_attempts: number;
  login_rate_limit_window: number;
  login_rate_limit_blacklist_time: number;
  login_rate_limit_promote_after: number;
  
  login_recaptcha_enabled: boolean;
  login_recaptcha_site_key: string;
  login_recaptcha_secret_key: string;
  login_recaptcha_threshold: number;
  
  login_2fa_enabled: boolean;
  login_2fa_issuer: string;
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
  login_2fa_issuer: 'Bromate REST API',
};

export default function LoginHardening(): JSX.Element {
  const portalContainer = usePortalContainer();
  const { openDialog } = useDialog();
  const { navigateGuarded } = useNavigation();
  const [settings, setSettings] = useState<LoginSettings>(DEFAULT_SETTINGS);
  const [loadedSettings, setLoadedSettings] = useState<LoginSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(loadedSettings),
    [settings, loadedSettings]
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await SettingsAPI.readOptions();
        const loadedSettings = { ...DEFAULT_SETTINGS };
        Object.keys(loadedSettings).forEach((key) => {
          if (key in response) {
            (loadedSettings as any)[key] = response[key];
          }
        });
        setSettings(loadedSettings);
        setLoadedSettings(loadedSettings);

        setError(null);
      } catch (err) {
        setError(__('Failed to load login settings.', 'bromate-rest-api-firewall'));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

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
      await SettingsAPI.updateOptions(settings);
      setLoadedSettings(settings);
      setSuccess(__('Settings saved successfully.', 'bromate-rest-api-firewall'));
    } catch (err) {
      setError(__('Failed to save settings.', 'bromate-rest-api-firewall'));
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleSaveConfirm = useCallback(() => {
    openDialog({
      type: DIALOG_TYPES.CONFIRM,
      title: __('Save login settings', 'bromate-rest-api-firewall'),
      content: __('Apply these login hardening changes now?', 'bromate-rest-api-firewall'),
      confirmLabel: __('Save', 'bromate-rest-api-firewall'),
      onConfirm: handleSave,
    });
  }, [openDialog, handleSave]);

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

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          disableElevation
          onClick={handleSaveConfirm}
          disabled={saving || !isDirty}
        >
          {saving ? __('Saving...', 'bromate-rest-api-firewall') : __('Save', 'bromate-rest-api-firewall')}
        </Button>
      </Stack>

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
                helperText={__('0 = never promote to global blacklist', 'bromate-rest-api-firewall')}
                sx={{ minWidth: 150 }}
              />
            </Stack>
          </Stack>


          {/* Blocked IPs Section */}
          {settings.login_rate_limit_enabled && (
              <Stack direction="column" gap={1}>
                <Typography variant="subtitle1" color="text.secondary">
                  {__('View and manage IPs blocked by login rate limiting in the Firewall tab.', 'bromate-rest-api-firewall')}
                </Typography>
                <Box>
                <Button
                    size="small"
                    disableElevation
                    variant="contained"
                    onClick={() => navigateGuarded('firewall', { entry_origin: 'login_rate_limit' })}
                    endIcon={<KeyboardArrowRightIcon fontSize="inherit" />}
                  >
                  {__('View blocked login IPs', 'bromate-rest-api-firewall')}
                  </Button>
                </Box>
              </Stack>
          )}

        </Stack>

      </Paper>

      {/* reCAPTCHA Section */}
      <Paper sx={{ p: 2 }} elevation={0}>
        <Stack flexDirection="column" gap={2}>
          <FormControlLabel
            label={
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography>{__('Enable reCAPTCHA v3', 'bromate-rest-api-firewall')}</Typography>
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
              helperText={__('reCAPTCHA v3 secret key from Google', 'bromate-rest-api-firewall')}
            />
            <TextField
              label={__('Score Threshold', 'bromate-rest-api-firewall')}
              type="number"
              size="small"
              slotProps={{ htmlInput:{min: 0, max: 1, step: 0.1} }}
              value={settings.login_recaptcha_threshold}
              onChange={(e) =>
                updateSetting('login_recaptcha_threshold', Number(e.target.value))
              }
              helperText={__('Minimum score (0.0 - 1.0) to pass verification', 'bromate-rest-api-firewall')}
              sx={{ maxWidth: 200 }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* 2FA Section */}
      <Paper sx={{ p: 2 }} elevation={0}>
        <Stack flexDirection="column" gap={2}>
          <FormControlLabel
            label={
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography>{__('Enable Two-Factor Authentication', 'bromate-rest-api-firewall')}</Typography>
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

            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={__('Issuer Name', 'bromate-rest-api-firewall')}
                size="small"
                value={settings.login_2fa_issuer}
                onChange={(e) =>
                  updateSetting('login_2fa_issuer', e.target.value)
                }
                sx={{ maxWidth: 400 }}
                helperText={__('Name shown in your authentication app', 'bromate-rest-api-firewall')}
              />
            </Stack>

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>{__('How it works:', 'bromate-rest-api-firewall')}</strong>
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                <li>
                  {__('Users can set up 2FA from their profile page using Google Authenticator or any TOTP-compatible app.', 'bromate-rest-api-firewall')}
                </li>
                <li>
                  {__('After enabling, users will be required to enter a verification code during login.', 'bromate-rest-api-firewall')}
                </li>
                <li>
                  {__('Backup codes are generated during setup for account recovery if the authenticator app is lost.', 'bromate-rest-api-firewall')}
                </li>
                <li>
                  {__('Users can manage their 2FA settings (enable/disable, regenerate backup codes) from their profile page.', 'bromate-rest-api-firewall')}
                </li>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                {__('Note: Users must enable 2FA in their profile for this feature to take effect.', 'bromate-rest-api-firewall')}
              </Typography>
            </Alert>
      
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