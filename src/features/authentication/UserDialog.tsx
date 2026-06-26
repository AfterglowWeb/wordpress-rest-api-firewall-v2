// components/UserDialog.tsx

import { useState, useEffect, useContext } from '@wordpress/element';
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
  Card, 
  CardContent,
} from '@mui/material';

import type { AuthorizedUser, UserStatus } from '@app-types/auth';
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

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active',  label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

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

  // Form fields
  const [wpUserId, setWpUserId]   = useState<number | ''>('');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [selectedWpUser, setSelectedWpUser] = useState<AuthorizedUser | null>(null);

  const portalContainer = usePortalContainer();


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

  return (
    <Dialog container={portalContainer} open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {isEditing ? `Edit — ${user?.display_name}` : 'Add authorized user'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>

          {!isEditing && (
            <Autocomplete<AuthorizedUser>
              options={wpUsers}
              loading={wpUsersLoading}
              getOptionLabel={getOptionLabel}
              isOptionEqualToValue={isOptionEqualToValue}
              value={selectedWpUser}
              onChange={handleWpUserSelect}
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

          <Divider />

          <Stack flexDirection="row" gap={2.5} sx={{ pt: 0.5 }}>
            <Card sx={{ p: 2, bgcolor: '#fff', maxWidth:400 }}>
              <CardContent sx={{ p: 0 }}>
                <Box display="flex" sx={{flexDirection:'column'}} gap={2}>
                  <TextField
                  label="JWT sub claim"
                    value={form.jwt_claim_sub}
                    onChange={(e) => updateField('jwt_claim_sub', e.target.value)}
                    helperText="Expected value in the incoming token's `sub` claim"
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={form.status}
                      onChange={(e) => updateField('status', e.target.value as UserStatus)}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                  label="Expires at"
                      type="date"
                      value={form.expires_at}
                      onChange={(e) => updateField('expires_at', e.target.value)}
                      helperText="Leave empty for no expiration"
                      fullWidth
                    />
                </Box>

              </CardContent>
            </Card> 

            {selectedWpUser && (
              <Card sx={{ p: 2, bgcolor: '#fff', maxWidth:300 }}>
                <CardContent sx={{ p: 0 }}>
                  <Box display="flex" sx={{flexDirection:'column'}} gap={0.5}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        ID:
                      </Typography>
                      <Typography variant="body2">{selectedWpUser.id}</Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Name:
                      </Typography>
                      <Typography variant="body2">{selectedWpUser.display_name}</Typography>
                      {selectedWpUser.current_user && (
                        <Box>
                        <Chip 
                          color="success" 
                          label="Me"
                          size="small"
                          variant="outlined"
                        />
                        </Box>
                      )}
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Roles:
                      </Typography>
                      <Typography variant="body2">
                        {selectedWpUser.roles.join(', ')}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Email:
                      </Typography>
                      <Typography variant="body2">{selectedWpUser.email}</Typography>
                    </Box>

                    

                    <Button 
                      variant="outlined" 
                      size="small"
                      href={`${selectedWpUser.admin_url}`}
                      target="_blank"
                      sx={{maxWidth:80}}
                    >
                      Profile
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
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