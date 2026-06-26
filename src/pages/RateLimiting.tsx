import { useState } from '@wordpress/element';
import {
  Box, Paper, Typography, Switch,
  Stack, TextField, Divider,
} from '@mui/material';
import type { RateLimitSettings } from '@app-types/rate-limiting';

export default function RateLimiting(): JSX.Element {
  const [settings, setSettings] = useState<RateLimitSettings>({
    rate_limit_enabled: false,
    rate_limit_max: 30,
    rate_limit_time: 60,
    rate_limit_block_duration: 300,
    rate_limit_blacklist_threshold: 5,
	  rate_limit_emergency_token_hash: '',
  });

  const update = <K extends keyof RateLimitSettings>(
    key: K,
    value: RateLimitSettings[K]
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Rate Limiting
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography fontWeight={600}>Enable API rate limiting</Typography>
            <Typography variant="body2" color="text.secondary">
              Protect against excessive API requests
            </Typography>
          </Box>
          <Switch
            checked={settings.rate_limit_enabled}
            onChange={(e) => update('rate_limit_enabled', e.target.checked)}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>Limits</Typography>
        <Stack direction="row" justifyContent="flex-start" alignItems="flex-start" spacing={2}>
          <TextField
            label="Maximum requests"
            type="number"
            value={settings.rate_limit_max}
            onChange={(e) => update('rate_limit_max', Number(e.target.value))}
          />
          <TextField
            label="Time window (seconds)"
            type="number"
            value={settings.rate_limit_time}
            onChange={(e) => update('rate_limit_time', Number(e.target.value))}
          />
          <TextField
            label="Block duration (seconds)"
            type="number"
            value={settings.rate_limit_block_duration}
            onChange={(e) => update('rate_limit_block_duration', Number(e.target.value))}
          />
          <TextField
            label="Blacklist threshold (violations before auto-ban)"
            type="number"
            value={settings.rate_limit_blacklist_threshold}
            onChange={(e) => update('rate_limit_blacklist_threshold', Number(e.target.value))}
            helperText="Number of rate limit violations before the IP is added to the blacklist"
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Emergency Access</Typography>
        <TextField
          label="Emergency bypass token hash"
          value={settings.rate_limit_emergency_token_hash}
          onChange={(e) => update('rate_limit_emergency_token_hash', e.target.value)}
          fullWidth
          helperText="Stored as hash (never expose raw token)"
        />
      </Paper>

    </Box>
  );
}