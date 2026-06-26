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
  Autocomplete,
  CircularProgress,
  Typography,
  Box,
  useTheme,
} from '@mui/material';

import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import type { AuthorizedUser } from '@app-types/auth';
import { usePortalContainer } from '@contexts/PortalContainerContext';


interface UserDialogProps {
  open: boolean;
  user: AuthorizedUser | null;
  onSave: (user: AuthorizedUser) => void;
  onClose: () => void;
  wpUsers: AuthorizedUser[];
  wpUsersLoading: boolean;
  fetchWordPressUsers: () => void;
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
};

export default function UserDialog({
  open,
  user,
  onSave,
  onClose,
  wpUsers,
  wpUsersLoading,
  fetchWordPressUsers,
}: UserDialogProps): JSX.Element {

  const isEditing = user !== null;
  const [wpUserId, setWpUserId]   = useState<number | ''>('');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [selectedWpUser, setSelectedWpUser] = useState<AuthorizedUser | null>(null);
  const portalContainer = usePortalContainer();
  const theme = useTheme();

  const noUser = !isEditing && selectedWpUser === null;

  useEffect(() => {
    if (!open) return;

    if (user) {
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
      });
      const matchedUser = wpUsers.find(wp => wp.id === user.id);
      setSelectedWpUser(matchedUser || null);
    } else {
      setWpUserId('');
      setForm(EMPTY_FORM);
      setSelectedWpUser(null);
    }
  }, [open, user]);

  useEffect(() => {
    if (open && !user) {
      fetchWordPressUsers();
    }
  }, [open]); 

  const handleWpUserSelect = (_: unknown, value: AuthorizedUser | null) => {
    setSelectedWpUser(value);
    if (!value) {
      setWpUserId('');
      return;
    }

    setWpUserId(value.id);
    setForm((prev) => ({
      ...prev,
      display_name:  value.display_name,
      roles:       value.roles,
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
      ...(selectedWpUser && {
        email: selectedWpUser.email,
        roles: selectedWpUser.roles,
      }),
    });
  };

  const isValid = wpUserId !== '' && form.display_name.trim() !== '';

  const getOptionLabel = (option: AuthorizedUser) => option.display_name;

  const isOptionEqualToValue = (option: AuthorizedUser, value: AuthorizedUser) => {
    return option.id === value.id;
  };

  const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
    <Box sx={{ minWidth: 150 }}>
      <Typography color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 500 }}>
        {value || '—'}
      </Typography>
    </Box>
  );

  return (
    <Dialog container={portalContainer} open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {isEditing ? `Edit — ${user?.display_name}` : 'Add authorized user'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="column" gap={2}>

          {!isEditing && (
            <Autocomplete<AuthorizedUser>
              options={wpUsers}
              loading={wpUsersLoading}
              getOptionLabel={getOptionLabel}
              isOptionEqualToValue={isOptionEqualToValue}
              value={selectedWpUser}
              onChange={handleWpUserSelect}
              disablePortal
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {option.display_name}{option.current_user && ' (me)'}
                    </Typography>
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
                  placeholder="Search or select a user..."
                  slotProps={{input:{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {wpUsersLoading && <CircularProgress size={16} />}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    },
                  }}
                />
              )}
            />
          )}
          
          <Stack direction="column" gap={2} mb={1}>
            <Stack direction="row" justifyContent={"space-between"} alignItems={"center"} gap={2}>
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
              variant="outlined"
              disabled={noUser}
              endIcon={<OpenInNewIcon />}
              size="small"
              href={selectedWpUser?.admin_url ?? form.admin_url}
              target="_blank"
              >Profile</Button>
            </Stack>
            <ReadonlyField label="Name" value={selectedWpUser?.display_name ?? form.display_name} />
            <ReadonlyField label="Email" value={selectedWpUser?.email ?? form.email} />
            <ReadonlyField label="Roles" value={(selectedWpUser?.roles ?? form.roles).join(', ')} />
          </Stack>
          
          <Stack direction="column" gap={2}>
            <TextField
              label="JWT sub claim"
              value={form.jwt_claim_sub}
              disabled={noUser}
              onChange={(e) => updateField('jwt_claim_sub', e.target.value)}
              helperText="Expected value in the incoming token's `sub` claim"
              size="small"
            />

            <TextField
              label="Authorization expires"
              type="date"
              value={form.expires_at || ''}
              disabled={noUser}
              onChange={(e) => updateField('expires_at', e.target.value)}
              helperText="Leave empty for no expiration"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

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