// components/UserDialog.tsx

import { useState, useEffect } from '@wordpress/element';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Chip,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import type { AuthorizedUser, UserStatus } from '@app-types/auth';

interface WpUserSuggestion {
  id: number;
  display_name: string;
  user_email: string;
  roles: string[];
}

interface UserDialogProps {
  open: boolean;
  user: AuthorizedUser | null;
  onSave: (user: AuthorizedUser) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active',   label: 'Active' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'revoked',  label: 'Revoked' },
];

const EMPTY_FORM: Omit<AuthorizedUser, 'id'> = {
  display_name: '',
  wp_role: '',
  jwt_claim_sub: '',
  status: 'active',
  expires_at: '',
};

export default function UserDialog({
  open,
  user,
  onSave,
  onClose,
}: UserDialogProps): JSX.Element {
  const isEditing = user !== null;

  // WP user search
  const [searchInput, setSearchInput]     = useState('');
  const [suggestions, setSuggestions]     = useState<WpUserSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedWpUser, setSelectedWpUser] = useState<WpUserSuggestion | null>(null);

  // Form fields
  const [wpUserId, setWpUserId]   = useState<number | ''>('');
  const [form, setForm]           = useState(EMPTY_FORM);

  // Reset when dialog opens/closes or user changes
  useEffect(() => {
    if (!open) return;

    if (user) {
      setWpUserId(user.id);
      setForm({
        display_name:  user.display_name,
        wp_role:       user.wp_role,
        jwt_claim_sub: user.jwt_claim_sub ?? '',
        status:        user.status,
        expires_at:    user.expires_at ?? '',
      });
      setSelectedWpUser(null);
      setSearchInput(user.display_name);
    } else {
      setWpUserId('');
      setForm(EMPTY_FORM);
      setSelectedWpUser(null);
      setSearchInput('');
    }
  }, [open, user]);

  // Fetch WP users from REST API as user types
  useEffect(() => {
    if (isEditing) return;
    if (searchInput.length < 2) { setSuggestions([]); return; }

    const controller = new AbortController();
    setSearchLoading(true);

    fetch(
      `/wp-json/wp/v2/users?search=${encodeURIComponent(searchInput)}&per_page=10&context=edit`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data: WpUserSuggestion[]) => setSuggestions(data))
      .catch(() => {})
      .finally(() => setSearchLoading(false));

    return () => controller.abort();
  }, [searchInput, isEditing]);

  const handleWpUserSelect = (_: unknown, value: WpUserSuggestion | null) => {
    setSelectedWpUser(value);
    if (!value) return;

    setWpUserId(value.id);
    setForm((prev) => ({
      ...prev,
      display_name:  value.display_name,
      wp_role:       value.roles[0] ?? '',
      // Pre-fill sub claim with WP convention if empty
      jwt_claim_sub: prev.jwt_claim_sub || `user_${value.id}`,
    }));
  };

  const updateField = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (wpUserId === '') return;
    onSave({
      id: wpUserId as number,
      ...form,
      jwt_claim_sub: form.jwt_claim_sub || undefined,
      expires_at:    form.expires_at    || undefined,
    });
  };

  const isValid = wpUserId !== '' && form.display_name.trim() !== '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEditing ? `Edit — ${user?.display_name}` : 'Add authorized user'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>

          {/* WP user lookup (creation only) */}
          {!isEditing ? (
            <Autocomplete<WpUserSuggestion>
              options={suggestions}
              loading={searchLoading}
              getOptionLabel={(o) => o.display_name}
              filterOptions={(x) => x}           // server-side search
              inputValue={searchInput}
              onInputChange={(_, v) => setSearchInput(v)}
              onChange={handleWpUserSelect}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {option.display_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.user_email} · ID #{option.id} · {option.roles.join(', ')}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search WordPress user"
                  placeholder="Name or email…"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searchLoading && <CircularProgress size={16} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">WP ID</Typography>
              <Chip label={`#${user?.id}`} size="small" />
            </Box>
          )}

          <Divider />

          {/* JWT claim sub */}
          <TextField
            label="JWT sub claim"
            value={form.jwt_claim_sub}
            onChange={(e) => updateField('jwt_claim_sub', e.target.value)}
            helperText="Valeur attendue dans le claim `sub` du token entrant"
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
            fullWidth
          />

          {/* Role + Status side by side */}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <TextField
              label="WP Role"
              value={form.wp_role}
              onChange={(e) => updateField('wp_role', e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.status}
                label="Status"
                onChange={(e) => updateField('status', e.target.value as UserStatus)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Expiration */}
          <TextField
            label="Expires at"
            type="date"
            value={form.expires_at}
            onChange={(e) => updateField('expires_at', e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Laisser vide pour ne pas limiter dans le temps"
            fullWidth
          />

        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!isValid}>
          {isEditing ? 'Save changes' : 'Add user'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}