import { useState, useEffect, useCallback } from '@wordpress/element';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Autocomplete, CircularProgress,
  Typography, Box, IconButton, Divider, Alert, Chip
} from '@mui/material';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';

import type { AuthorizedUser } from '@app-types/auth';
import type { IpEntry } from '@services/ip';
import { IpAPI } from '@services/ip';
import { usePortalContainer } from '@contexts/PortalContainerContext';

interface UserDialogProps {
  open: boolean;
  user: AuthorizedUser | null;
  onSave: (user: AuthorizedUser) => void;
  onClose: () => void;
  wpUsers: AuthorizedUser[];
  wpUsersLoading: boolean;
  fetchWordPressUsers: () => void;
  authorizedUserIds: number[];
  onIpAdded?: () => void;
}

const EMPTY_FORM: Omit<AuthorizedUser, 'id'> = {
  display_name: '',
  email: '',
  admin_url: '',
  current_user: false,
  roles: [],
  jwt_claim_sub: '',
  status: 'active',
  expires_at: '',
  ip_entries: [],
};

export default function UserDialog({
  open, user, onSave, onClose,
  wpUsers, wpUsersLoading, fetchWordPressUsers, authorizedUserIds, onIpAdded,
}: UserDialogProps): JSX.Element {

  const isEditing = user !== null;
  const [wpUserId, setWpUserId]           = useState<number | ''>('');
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [selectedWpUser, setSelectedWpUser] = useState<AuthorizedUser | null>(null);
  const [saving, setSaving]               = useState(false);

  const [ipEntries, setIpEntries]   = useState<IpEntry[]>([]);
  const [newIpValue, setNewIpValue] = useState('');
  const [newReferrer, setNewReferrer] = useState('');
  const [ipError, setIpError]       = useState<string | null>(null);

  const portalContainer = usePortalContainer();
  const noUser = !isEditing && selectedWpUser === null;
  const currentUserId = isEditing ? user!.id : (selectedWpUser?.id ?? null);
  const isValid = wpUserId !== '' && form.display_name.trim() !== '';

  useEffect(() => {
  if (!open) return;
  if (user) {
    // Re-resolve from wpUsers to get fresh ip_entries
    const freshUser = wpUsers.find(wp => wp.id === user.id);
    const resolvedIpEntries = freshUser?.ip_entries ?? user.ip_entries ?? [];

    setWpUserId(user.id);
    setForm({
      display_name:  user.display_name,
      email:         user.email,
      current_user:  user.current_user,
      admin_url:     user.admin_url,
      roles:         user.roles,
      jwt_claim_sub: user.jwt_claim_sub ?? '',
      status:        user.status || 'active',
      expires_at:    user.expires_at ?? '',
      ip_entries:    resolvedIpEntries,
    });
    setIpEntries(resolvedIpEntries);
    const sharedReferrer = resolvedIpEntries.length > 0
  ? (resolvedIpEntries[0].referrer ?? '')
  : '';
setNewReferrer(sharedReferrer);
    setSelectedWpUser(freshUser || null);
  } else {
    setWpUserId('');
    setForm(EMPTY_FORM);
    setSelectedWpUser(null);
    setIpEntries([]);
  }
  setNewIpValue('');
  setNewReferrer('');
  setIpError(null);
  setSaving(false);
}, [open, user, wpUsers]);

  useEffect(() => {
    if (open && !user) fetchWordPressUsers();
  }, [open]);

  useEffect(() => {
    if (!selectedWpUser) { setIpEntries([]); return; }
    setIpEntries(selectedWpUser.ip_entries ?? []);
  }, [selectedWpUser]);

  const handleWpUserSelect = (_: unknown, value: AuthorizedUser | null) => {
    setSelectedWpUser(value);
    if (!value) { setWpUserId(''); return; }
    setWpUserId(value.id);
    setForm((prev) => ({
      ...prev,
      display_name:  value.display_name,
      roles:         value.roles,
      jwt_claim_sub: prev.jwt_claim_sub || `user_${value.id}`,
      ip_entries:    value.ip_entries || [],
    }));
  };

  const updateField = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRemoveIp = useCallback(async (id: number) => {
    await IpAPI.deleteEntry(id);
    setIpEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleSave = async () => {
    if (wpUserId === '') return;
    setSaving(true);
    setIpError(null);

    let ipAdded = false;
    if (currentUserId && newIpValue.trim()) {
      const lines = newIpValue.split('\n').map(l => l.trim()).filter(Boolean);
      const results = await Promise.allSettled(
        lines.map((ip) =>
          IpAPI.addEntry(ip, 'whitelist', currentUserId, newReferrer.trim() || null)
        )
      );

      const failures = results
        .map((r, i) => ({ r, ip: lines[i] }))
        .filter(({ r }) => r.status === 'rejected')
        .map(({ r, ip }) => `${ip}: ${(r as PromiseRejectedResult).reason?.message ?? 'error'}`);

      if (failures.length) {
        setIpError(failures.join('\n'));
        setSaving(false);
        return;
      }

      const fresh = await IpAPI.getUserEntries(currentUserId);
      setIpEntries(fresh.entries);
      setNewIpValue('');
      setNewReferrer('');
      ipAdded = true;
    }

    onSave({
      id: wpUserId as number,
      ...form,
      jwt_claim_sub: form.jwt_claim_sub || undefined,
      expires_at:    form.expires_at    || undefined,
      ip_entries:    ipEntries,
      ...(selectedWpUser && {
        email: selectedWpUser.email,
        roles: selectedWpUser.roles,
      }),
    });

    if (ipAdded && onIpAdded) {
      onIpAdded();
    }


    setSaving(false);
  };

  const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
    </Box>
  );

  return (
    <Dialog container={portalContainer} open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEditing ? `Edit — ${user?.display_name}` : 'Add authorized user'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="column" gap={2.5}>

          {/* ── WP user picker ── */}
          {!isEditing && (
            <Autocomplete<AuthorizedUser>
              options={wpUsers}
              loading={wpUsersLoading}
              getOptionLabel={(o) => o.display_name}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={selectedWpUser}
              onChange={handleWpUserSelect}
              getOptionDisabled={(o) => authorizedUserIds.includes(o.id)}
              disablePortal
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {option.display_name}
                      </Typography>
                      {option.current_user && (
                        <Chip label="Me" size="small" color="primary" sx={{ height: 18, fontSize: 11 }} />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {option.email} · ID #{option.id} · {option.roles.join(', ')}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select WordPress user"
                  size="small"
                  slotProps={{ input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {wpUsersLoading && <CircularProgress size={16} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}}
                />
              )}
            />
          )}

          {/* ── Status + profile link ── */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <FormControlLabel
              label="User Active"
              control={
                <Switch
                  checked={form.status === 'active'}
                  disabled={noUser}
                  onChange={(e) => updateField('status', e.target.checked ? 'active' : 'revoked')}
                />
              }
            />
            <Button
              variant="outlined" size="small" disabled={noUser}
              endIcon={<OpenInNewIcon />}
              href={selectedWpUser?.admin_url ?? form.admin_url}
              target="_blank"
            >Profile</Button>
          </Stack>

          
          {/* ── Readonly user info ── */}
          <Stack direction="row" gap={3}>
            <ReadonlyField label="ID"  value={selectedWpUser?.id.toString() ?? '' } />
            <Stack >
              <ReadonlyField label="Name"  value={selectedWpUser?.display_name ?? form.display_name} />
              {selectedWpUser?.current_user && (
                  <Box mt={0.5}><Chip label="Me" size="small" color="primary" sx={{ height: 18, fontSize: 11 }} /></Box>
                )}
            </Stack>
            <ReadonlyField label="Email" value={selectedWpUser?.email ?? form.email} />
            <ReadonlyField label="Roles" value={(selectedWpUser?.roles ?? form.roles).join(', ')} />
          </Stack>

          <Divider />

          {/* ── JWT + expiry ── */}
          <TextField
            label="JWT sub claim" value={form.jwt_claim_sub} disabled={noUser} size="small"
            onChange={(e) => updateField('jwt_claim_sub', e.target.value)}
            helperText="Expected value in the incoming token's `sub` claim"
          />
          <TextField
            label="Authorization expires" type="date" value={form.expires_at || ''}
            disabled={noUser} size="small"
            onChange={(e) => updateField('expires_at', e.target.value)}
            helperText="Leave empty for no expiration"
            slotProps={{ inputLabel: { shrink: true } }}
          />


          {/* ── Whitelisted IPs ── */}
          <Box>

            {ipEntries.length > 0 && (
              <Stack direction="column" gap={0.5} mb={2}>
                {ipEntries.map((entry) => (
                  <Stack key={entry.id} direction="row" alignItems="center" gap={1}
                    sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1 }}>
                      {entry.ip}
                    </Typography>
                    {entry.referrer && (
                      <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                        ↳ {entry.referrer}
                      </Typography>
                    )}
                    <IconButton size="small" color="error" disabled={noUser}
                      onClick={() => handleRemoveIp(entry.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
            <Stack direction="column" gap={1.5}>
              <TextField
                label="IPs to whitelist (one per line)"
                placeholder={'203.0.113.1\n203.0.113.0/24'}
                value={newIpValue}
                onChange={(e) => setNewIpValue(e.target.value)}
                multiline minRows={2} maxRows={6}
                fullWidth size="small"
                disabled={noUser}
              />
              <TextField
                label="Allowed origin (optional)"
                placeholder="https://app.example.com"
                value={newReferrer}
                onChange={(e) => setNewReferrer(e.target.value)}
                fullWidth size="small"
                disabled={noUser}
                helperText="If set, all IPs above are restricted to this origin"
              />
              {ipError && (
                <Alert severity="error" variant="outlined">
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{ipError}</Typography>
                </Alert>
              )}
            </Stack>
          </Box>

        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!isValid || saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add user'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}