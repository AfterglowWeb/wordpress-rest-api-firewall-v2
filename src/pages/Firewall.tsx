import { useState, useCallback, useEffect, useMemo } from '@wordpress/element';
import {
  Box, Paper, Typography, Switch,
  Stack, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Toolbar,
  Alert, CircularProgress, List, ListItem, ListItemText,
  FormControlLabel, Radio, RadioGroup, FormLabel, FormControl,
} from '@mui/material';
import {
  DataGrid, GridColDef, GridRowId,
  GridRowSelectionModel, useGridApiContext
} from '@mui/x-data-grid';
import type { RateLimitSettings } from '@app-types/rate-limiting';
import { IpAPI, type IpEntry, type ListType } from '@services/ip';
import { usePortalContainer } from '@contexts/PortalContainerContext';


type EntryType = 'ip' | 'cidr';

interface AddEntryForm {
  value: string;
  entry_type: EntryType;
  list_type: ListType;
}

interface LineResult {
  value: string;
  error: string;
}

const EMPTY_FORM: AddEntryForm = {
  value: '',
  entry_type: 'ip',
  list_type: 'blacklist',
};

interface CustomToolbarProps {
  onAdd: () => void;
  onDeleteSelected: (rows: Map<GridRowId, IpEntry>) => void;
}

function CustomToolbar({ onAdd, onDeleteSelected }: CustomToolbarProps) {
  const apiRef = useGridApiContext();
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Map<GridRowId, IpEntry>>(new Map());

  useEffect(() => {
    const update = () => {
      const rows = apiRef.current.getSelectedRows() as Map<GridRowId, IpEntry>;
      setSelectedCount(rows.size);
      setSelectedRows(rows);
    };
    update();
    return apiRef.current.subscribeEvent('rowSelectionChange', update);
  }, [apiRef]);

  return (
    <Toolbar>
      <Button onClick={onAdd}>Add IPs</Button>
      <Button
        color="error"
        disabled={selectedCount === 0}
        onClick={() => onDeleteSelected(selectedRows)}
      >
        Delete ({selectedCount})
      </Button>
    </Toolbar>
  );
}

interface AddEntryDialogProps {
  open: boolean;
  defaultListType: ListType;
  onSave: (form: AddEntryForm) => Promise<LineResult[]>;
  onClose: () => void;
}

function AddEntryDialog({ open, defaultListType, onSave, onClose }: AddEntryDialogProps) {
  const [form, setForm] = useState<AddEntryForm>({ ...EMPTY_FORM, list_type: defaultListType });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LineResult[]>([]);
  const portalContainer = usePortalContainer();

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, list_type: defaultListType });
      setErrors([]);
    }
  }, [open, defaultListType]);

  const update = <K extends keyof AddEntryForm>(key: K, value: AddEntryForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    const lineErrors = await onSave(form);
    setSaving(false);
    if (lineErrors.length > 0) setErrors(lineErrors);
  };

  return (
    <Dialog
      container={portalContainer}
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Add access control entries</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <FormControl>
            <FormLabel>List</FormLabel>
            <RadioGroup
              row
              value={form.list_type}
              onChange={(e) => update('list_type', e.target.value as ListType)}
            >
              <FormControlLabel value="blacklist" control={<Radio size="small" />} label="Blacklist" />
              <FormControlLabel value="whitelist" control={<Radio size="small" />} label="Whitelist" />
            </RadioGroup>
          </FormControl>

          <FormControl>
            <FormLabel>Entry type</FormLabel>
            <RadioGroup
              row
              value={form.entry_type}
              onChange={(e) => {
                update('entry_type', e.target.value as EntryType);
                update('value', '');
              }}
            >
              <FormControlLabel value="ip"   control={<Radio size="small" />} label="IP" />
              <FormControlLabel value="cidr" control={<Radio size="small" />} label="CIDR range" />
            </RadioGroup>
          </FormControl>

          <TextField
            label="IPs / CIDRs (one per line)"
            placeholder={'203.0.113.1\n203.0.113.2\n203.0.113.0/24'}
            value={form.value}
            onChange={(e) => update('value', e.target.value)}
            multiline
            minRows={4}
            maxRows={10}
            fullWidth
            size="small"
            disabled={saving}
          />

          {errors.length > 0 && (
            <Alert severity="error" variant="outlined">
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                {errors.length} entr{errors.length > 1 ? 'ies' : 'y'} failed:
              </Typography>
              <List dense disablePadding>
                {errors.map((e) => (
                  <ListItem key={e.value} disablePadding>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontFamily="monospace">
                          {e.value} — {e.error}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={form.value.trim() === '' || saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {saving ? 'Adding…' : 'Add entries'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const IP_COLUMNS: GridColDef[] = [
  { field: 'ip',           headerName: 'IP / CIDR', flex: 1 },
  { field: 'list_type',    headerName: 'List',      width: 110 },
  { field: 'entry_type',   headerName: 'Type',      width: 110 },
  { field: 'country_code', headerName: 'Country',   width: 100 },
  {
    field: 'blocked_at',
    headerName: 'Blocked at',
    width: 160,
    valueFormatter: ({ value }) => value ? new Date(value).toLocaleString() : '—',
  },
  {
    field: 'created_at',
    headerName: 'Added',
    width: 160,
    valueFormatter: ({ value }) => value ? new Date(value).toLocaleString() : '—',
  },
];

export default function Firewall(): JSX.Element {

  const [settings, setSettings] = useState<RateLimitSettings>({
    rate_limit_enabled: false,
    rate_limit_wordpress_enabled: false,
    rate_limit_max: 30,
    rate_limit_time: 60,
    rate_limit_block_duration: 300,
    rate_limit_blacklist_threshold: 5,
    rate_limit_emergency_token_hash: '',
  });

  const updateSetting = <K extends keyof RateLimitSettings>(key: K, value: RateLimitSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const [listType, setListType]     = useState<ListType>('blacklist');
  const [rows, setRows]             = useState<IpEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selection, setSelection]   = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

  const load = useCallback(async () => {
    const res = await IpAPI.getEntries(listType);
    setRows(res.entries);
  }, [listType]);

  useEffect(() => { void load(); }, [load]);

  const handleAddEntries = async (form: AddEntryForm): Promise<LineResult[]> => {
    const lines = form.value.split('\n').map((l) => l.trim()).filter(Boolean);

    const results = await Promise.allSettled(
      lines.map((val) => IpAPI.addEntry(val, form.list_type))
    );

    const errors: LineResult[] = results
      .map((result, i) => ({ result, val: lines[i] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, val }) => ({
        value: val,
        error: (result as PromiseRejectedResult).reason?.message ?? 'Unknown error',
      }));

    const anySuccess = results.some((r) => r.status === 'fulfilled');
    if (anySuccess) {
      if (form.list_type !== listType) setListType(form.list_type);
      else await load();
    }

    if (errors.length === 0) setDialogOpen(false);
    return errors;
  };

  // handleDeleteSelected now receives the rows map directly:
const handleDeleteSelected = useCallback(async (rows: Map<GridRowId, IpEntry>) => {
  if (rows.size === 0) return;
  const ids = Array.from(rows.keys()).map(Number);
  await IpAPI.deleteEntries(ids);
  setSelection({ type: 'include', ids: new Set() });
  await load();
}, [load]);

  const toolbarSlots = useMemo(() => ({ toolbar: CustomToolbar }), []);

  return (
    <Box>
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
            onChange={(e) => updateSetting('rate_limit_enabled', e.target.checked)}
          />
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography fontWeight={600}>Enable global rate limiting</Typography>
            <Typography variant="body2" color="text.secondary">
              Protect all WordPress installation against excessive requests
            </Typography>
          </Box>
          <Switch
            checked={settings.rate_limit_wordpress_enabled}
            onChange={(e) => updateSetting('rate_limit_wordpress_enabled', e.target.checked)}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>Limits</Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-start">
          <TextField
            label="Maximum requests"
            type="number"
            value={settings.rate_limit_max}
            onChange={(e) => updateSetting('rate_limit_max', Number(e.target.value))}
          />
          <TextField
            label="Time window (seconds)"
            type="number"
            value={settings.rate_limit_time}
            onChange={(e) => updateSetting('rate_limit_time', Number(e.target.value))}
          />
          <TextField
            label="Block duration (seconds)"
            type="number"
            value={settings.rate_limit_block_duration}
            onChange={(e) => updateSetting('rate_limit_block_duration', Number(e.target.value))}
          />
          <TextField
            label="Blacklist threshold"
            type="number"
            value={settings.rate_limit_blacklist_threshold}
            onChange={(e) => updateSetting('rate_limit_blacklist_threshold', Number(e.target.value))}
            helperText="Violations before auto-ban"
          />
        </Stack>
      </Paper>

      <Paper sx={{ height: 600, mb: 2 }}>
        <DataGrid
          rows={rows}
          getRowId={(row) => row.id}
          columns={IP_COLUMNS}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          showToolbar
          slots={toolbarSlots}
          slotProps={{
            toolbar: {
              onAdd: () => setDialogOpen(true),
              onDeleteSelected: handleDeleteSelected,
            } as any,
          }}
        />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Emergency Access</Typography>
        <TextField
          label="Emergency bypass token hash"
          value={settings.rate_limit_emergency_token_hash}
          onChange={(e) => updateSetting('rate_limit_emergency_token_hash', e.target.value)}
          fullWidth
          helperText="Stored as hash — never expose the raw token"
        />
      </Paper>

      <AddEntryDialog
        open={dialogOpen}
        defaultListType={listType}
        onSave={handleAddEntries}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}
