import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SettingsAPI } from '@services/settings';
import { UserSessionsAPI, SaltRotationStatus } from '@services/user-sessions';
import { useNavigation } from '@contexts/NavigationContext';
import { usePortalContainer } from '@contexts/PortalContainerContext';

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
  Tooltip,
  RadioGroup,
  Radio,
  Divider,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ShieldIcon from '@mui/icons-material/Shield';

import { useDialog, DIALOG_TYPES } from '@contexts/DialogContext';
import ConfirmDialog from '@components/ConfirmDialog';

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
  login_2fa_policy: 'grace' | 'mandatory' | 'free';
  login_2fa_grace_period: number;

  cookie_hardening_samesite_enabled: boolean;
  cookie_hardening_samesite_mode: 'Strict' | 'Lax';

  cookie_hardening_salt_rotation_enabled: boolean;
  cookie_hardening_salt_rotation_recurrence: 'day' | 'week' | 'month';
  cookie_hardening_salt_rotation_time: string;

  cookie_hardening_max_concurrent_sessions: number;
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
  login_2fa_policy: 'grace',
  login_2fa_grace_period: 7,

  cookie_hardening_samesite_enabled: false,
  cookie_hardening_samesite_mode: 'Strict',

  cookie_hardening_salt_rotation_enabled: false,
  cookie_hardening_salt_rotation_recurrence: 'week',
  cookie_hardening_salt_rotation_time: '03:00',

  cookie_hardening_max_concurrent_sessions: 0,
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return __('Never', 'bromate-rest-api-firewall');
  }
  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export default function LoginHardening(): JSX.Element {
  const { openDialog } = useDialog();
  const { navigateGuarded } = useNavigation();
  const portalContainer = usePortalContainer();
  
  const [settings, setSettings] = useState<LoginSettings>(DEFAULT_SETTINGS);
  const [loadedSettings, setLoadedSettings] = useState<LoginSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rotationStatus, setRotationStatus] = useState<SaltRotationStatus | null>(null);
  const [rotatingNow, setRotatingNow] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

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

  const loadRotationStatus = useCallback(async () => {
    try {
      const status = await UserSessionsAPI.getSaltRotationStatus();
      setRotationStatus(status);
    } catch (err) {
      // Non bloquant : l'affichage du statut est secondaire, on ne casse
      // pas la page si cet appel échoue.
      setRotationStatus(null);
    }
  }, []);

  useEffect(() => {
    loadRotationStatus();
  }, [loadRotationStatus]);

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

  const handleRotateSaltsNow = useCallback(async () => {
    setRotatingNow(true);
    setError(null);
    setSuccess(null);

    try {
      await UserSessionsAPI.rotateSaltsNow();
      setSuccess(
        __('Salt keys rotated. Every logged-in user, including you, has been signed out.', 'bromate-rest-api-firewall')
      );
      await loadRotationStatus();
    } catch (err) {
      setError(__('Failed to rotate salt keys.', 'bromate-rest-api-firewall'));
    } finally {
      setRotatingNow(false);
    }
  }, [loadRotationStatus]);

  const handleRotateSaltsConfirm = useCallback(() => {
    openDialog({
      type: DIALOG_TYPES.CONFIRM,
      title: __('Rotate salt keys now', 'bromate-rest-api-firewall'),
      content: __(
        'This immediately signs out every logged-in user on this site, including you. Continue?',
        'bromate-rest-api-firewall'
      ),
      confirmLabel: __('Rotate now', 'bromate-rest-api-firewall'),
      onConfirm: handleRotateSaltsNow,
    });
  }, [openDialog, handleRotateSaltsNow]);

  const handleRevokeAll = useCallback(async () => {
    setRevokingAll(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await UserSessionsAPI.revokeAllTrustedDevices();
      setSuccess(
        result.message ||
          __('All sessions and trusted 2FA devices have been revoked.', 'bromate-rest-api-firewall')
      );
    } catch (err) {
      setError(__('Failed to revoke sessions and trusted devices.', 'bromate-rest-api-firewall'));
    } finally {
      setRevokingAll(false);
    }
  }, []);

  const handleRevokeAllConfirm = useCallback(() => {
    openDialog({
      type: DIALOG_TYPES.CONFIRM,
      title: __('Revoke all sessions & trusted devices', 'bromate-rest-api-firewall'),
      content: __(
        'This signs out every user on this site and clears every "remember this device" 2FA token. Users will need to log in (and pass 2FA again) on their next visit. Continue?',
        'bromate-rest-api-firewall'
      ),
      confirmLabel: __('Revoke everything', 'bromate-rest-api-firewall'),
      onConfirm: handleRevokeAll,
    });
  }, [openDialog, handleRevokeAll]);

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
    <Stack spacing={3} p={0}>

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
        <Stack flexDirection="row" gap={0.5} alignItems={"center"}>
          
          
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

          </Stack>
          <Stack>

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
              helperText={__('reCAPTCHA v3 site key', 'bromate-rest-api-firewall')}
            />
            <TextField
              label={__('Secret Key', 'bromate-rest-api-firewall')}
              size="small"
              type="password"
              value={settings.login_recaptcha_secret_key}
              onChange={(e) =>
                updateSetting('login_recaptcha_secret_key', e.target.value)
              }
              helperText={__('reCAPTCHA v3 secret key', 'bromate-rest-api-firewall')}
            />
            <TextField
              label={__('Minimum score', 'bromate-rest-api-firewall')}
              type="number"
              size="small"
              slotProps={{ htmlInput:{min: 0, max: 1, step: 0.1} }}
              value={settings.login_recaptcha_threshold}
              onChange={(e) =>
                updateSetting('login_recaptcha_threshold', Number(e.target.value))
              }
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

          <FormControl component="fieldset" sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {__('Enforcement Policy', 'bromate-rest-api-firewall')}
            </Typography>
            <RadioGroup
              value={settings.login_2fa_policy || 'grace'}
              onChange={(e) =>
                updateSetting('login_2fa_policy', e.target.value as 'grace' | 'mandatory' | 'free')
              }
            >
              <FormControlLabel
                value="free"
                control={<Radio />}
                label={
                  <Stack>
                    <Typography variant="body2">
                      {__('Free', 'bromate-rest-api-firewall')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {__('Users can optionally enable 2FA from their profile.', 'bromate-rest-api-firewall')}
                    </Typography>
                  </Stack>
                }
              />
              <FormControlLabel
                value="grace"
                control={<Radio />}
                label={
                  <Stack>
                    <Typography variant="body2">
                      {__('Grace Period', 'bromate-rest-api-firewall')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {__('Users have a grace period to enable 2FA before it becomes mandatory.', 'bromate-rest-api-firewall')}
                    </Typography>
                  </Stack>
                }
              />
                <Box sx={{ pl: 4, pt: 1 }}>
                  <TextField
                    label={__('Grace Period (days)', 'bromate-rest-api-firewall')}
                    type="number"
                    size="small"
                    value={settings.login_2fa_grace_period || 7}
                    onChange={(e) =>
                      updateSetting('login_2fa_grace_period', Number(e.target.value))
                    }
                    slotProps={{ htmlInput: { min: 1, max: 30 } }}
                    helperText={__('Number of days before 2FA becomes mandatory', 'bromate-rest-api-firewall')}
                    sx={{ maxWidth: 200 }}
                  />
                </Box>

              <FormControlLabel
                value="mandatory"
                control={<Radio />}
                label={
                  <Stack>
                    <Typography variant="body2">
                      {__('Mandatory', 'bromate-rest-api-firewall')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {__('All users must enable 2FA. No cancellation allowed.', 'bromate-rest-api-firewall')}
                    </Typography>
                  </Stack>
                }
              />
            </RadioGroup>
          </FormControl>

        </Stack>
      </Paper>

      {/* Cookie & Session Protection Section */}
      <Paper sx={{ p: 2 }} elevation={0}>
        <Stack flexDirection="column" gap={3} maxWidth={500}>
          <Stack direction="row" alignItems="center" gap={1}>
            <ShieldIcon fontSize="small" color="action" />
            <Typography variant="h6">
              {__('Cookie & Session Protection', 'bromate-rest-api-firewall')}
            </Typography>
          </Stack>

          {/* SameSite */}
          <Stack gap={1}>
            <FormControlLabel
              label={
                <Stack direction="column" alignItems="center" gap={1}>
                  <Typography>{__('Protect Session Cookie', 'bromate-rest-api-firewall')}</Typography>
                </Stack>
              }
              control={
                <Switch
                  checked={settings.cookie_hardening_samesite_enabled}
                  onChange={(e) =>
                    updateSetting('cookie_hardening_samesite_enabled', e.target.checked)
                  }
                />
              }
            />
            

              <Box sx={{ pl: 4 }}>
                <FormControl 
                disabled={!settings.cookie_hardening_samesite_enabled}
                component="fieldset">
                  <RadioGroup
                    row
                    value={settings.cookie_hardening_samesite_mode}
                    onChange={(e) =>
                      updateSetting(
                        'cookie_hardening_samesite_mode',
                        e.target.value as 'Strict' | 'Lax'
                      )
                    }
                  >
                    <FormControlLabel value="Strict" control={<Radio size="small" />} label={__('Strict', 'bromate-rest-api-firewall')} />
                    <FormControlLabel value="Lax" control={<Radio size="small" />} label={__('Lax', 'bromate-rest-api-firewall')} />
                  </RadioGroup>
                </FormControl>
                
              </Box>
     
          </Stack>

          {/* Salt Rotation */}
          <Stack gap={1}>
            <FormControlLabel
              label={
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography>{__('Rotate Salt Keys', 'bromate-rest-api-firewall')}</Typography>
                </Stack>
              }
              control={
                <Switch
                  checked={settings.cookie_hardening_salt_rotation_enabled}
                  onChange={(e) =>
                    updateSetting('cookie_hardening_salt_rotation_enabled', e.target.checked)
                  }
                />
              }
            />

              <Box sx={{ pl: 4 }}>
                <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-start">
                  <TextField
                    select
                    slotProps={{select:{MenuProps:{container:portalContainer}}}}
                    label={__('Recurrence', 'bromate-rest-api-firewall')}
                    size="small"
                    value={settings.cookie_hardening_salt_rotation_recurrence}
                    onChange={(e) =>
                      updateSetting(
                        'cookie_hardening_salt_rotation_recurrence',
                        e.target.value as 'day' | 'week' | 'month'
                      )
                    }
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="day">{__('Every day', 'bromate-rest-api-firewall')}</MenuItem>
                    <MenuItem value="week">{__('Every week', 'bromate-rest-api-firewall')}</MenuItem>
                    <MenuItem value="month">{__('Every month', 'bromate-rest-api-firewall')}</MenuItem>
                  </TextField>

                  <TextField
                    label={__('Rotation Time', 'bromate-rest-api-firewall')}
                    type="time"
                    size="small"
                    value={settings.cookie_hardening_salt_rotation_time}
                    onChange={(e) =>
                      updateSetting('cookie_hardening_salt_rotation_time', e.target.value)
                    }
                    sx={{ minWidth: 150 }}
                  />
                </Stack>

                <Alert severity="warning" sx={{ mt: 2 }} elevation={0}>
                  {__(
                    'Rotation signs out every logged-in user, you may chose an off-peak hour.',
                    'bromate-rest-api-firewall'
                  )}
                </Alert>

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }} flexWrap="wrap" gap={1}>
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      {__('Last rotation:', 'bromate-rest-api-firewall')} {formatDateTime(rotationStatus?.last_rotation ?? null)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {__('Next rotation:', 'bromate-rest-api-firewall')} {formatDateTime(rotationStatus?.next_rotation ?? null)}
                    </Typography>
                  </Stack>

                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={rotatingNow}
                    startIcon={rotatingNow ? <CircularProgress size={16} /> : undefined}
                    onClick={handleRotateSaltsConfirm}
                  >
                    {rotatingNow
                      ? __('Rotating...', 'bromate-rest-api-firewall')
                      : __('Rotate now', 'bromate-rest-api-firewall')}
                  </Button>
                </Stack>
              </Box>
       
          </Stack>

          {/* Session limit */}
          <Stack gap={1} >
            <Typography >
              {__('Concurrent Sessions', 'bromate-rest-api-firewall')}
            </Typography>
            <TextField
              label={__('Max Concurrent Sessions', 'bromate-rest-api-firewall')}
              type="number"
              size="small"
              value={settings.cookie_hardening_max_concurrent_sessions}
              onChange={(e) =>
                updateSetting('cookie_hardening_max_concurrent_sessions', Number(e.target.value))
              }
              helperText={__('0 = unlimited. Oldest session is closed automatically beyond this number.', 'bromate-rest-api-firewall')}
              slotProps={{ htmlInput: { min: 0 } }}
              sx={{ maxWidth: 250 }}
            />
          </Stack>

          {/* Global revoke */}
          <Stack gap={1}>
            <Typography >
              {__('Emergency Action', 'bromate-rest-api-firewall')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {__(
                'Immediately signs out every user on this site and clears every "remember this device" 2FA token. Use this if you suspect an account compromise.',
                'bromate-rest-api-firewall'
              )}
            </Typography>
            <Box>
              <Button
                size="small"
                variant="contained"
                color="error"
                disableElevation
                disabled={revokingAll}
                startIcon={revokingAll ? <CircularProgress size={16} color="inherit" /> : undefined}
                onClick={handleRevokeAllConfirm}
              >
                {revokingAll
                  ? __('Revoking...', 'bromate-rest-api-firewall')
                  : __('Revoke all sessions & trusted devices', 'bromate-rest-api-firewall')}
              </Button>
            </Box>
          </Stack>
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
