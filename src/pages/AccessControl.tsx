import { useEffect, useState, useCallback, useMemo } from '@wordpress/element';
import {
  Box, Paper, Typography, Button, Stack,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Toolbar,
  Alert, CircularProgress, List, ListItem, ListItemText,
  RadioGroup, FormControlLabel, Radio, FormLabel
} from '@mui/material';
import {
  DataGrid, GridColDef, GridRowSelectionModel,
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { IpAPI, type IpEntry, type ListType } from '@services/ip';
import { usePortalContainer } from '@contexts/PortalContainerContext';

interface AddEntryForm {
  value: string;
  entry_type: EntryType;
  list_type: ListType;
}

type EntryType = 'ip' | 'cidr';

interface AddEntryForm {
  value: string;
  entry_type: EntryType;
  list_type: ListType;
}

const EMPTY_FORM: AddEntryForm = {
  value: '',
  entry_type: 'ip',
  list_type: 'blacklist',
};

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    onAdd: () => void;
    onDeleteSelected: () => void;
    selectedCount: number;
  }
}

interface CustomToolbarProps {
  onAdd: () => void;
  onDeleteSelected: () => void;
  selectedCount: number;
}

function CustomToolbar({ onAdd, onDeleteSelected, selectedCount }: CustomToolbarProps) {
  return (
    <Toolbar>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          startIcon={<AddIcon />}
          size="small"
          variant="contained"
          onClick={onAdd}
        >
          Add IPs
        </Button>
        <Button
          startIcon={<DeleteForeverIcon />}
          size="small"
          variant="outlined"
          color="error"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
        >
          Delete selected ({selectedCount})
        </Button>
      </Box>
    </Toolbar>
  );
}

interface LineResult {
  value: string;
  error: string;
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
    if (lineErrors.length > 0) {
      setErrors(lineErrors);
    }
  };

  const isValid = form.value.trim() !== '';
  const placeholder = '203.0.113.1\n203.0.113.2\n203.0.113.0/24';

  return (
    <Dialog container={portalContainer} open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
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
            placeholder={placeholder}
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
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!isValid || saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {saving ? 'Adding…' : 'Add entries'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AccessControl(): JSX.Element {
  const [listType, setListType] = useState<ListType>('blacklist');
  const [rows, setRows]         = useState<IpEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selection, setSelection] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

  const load = useCallback(async () => {
    const res = await IpAPI.getEntries(listType);
    setRows(res.entries);
  }, [listType]);

  useEffect(() => { void load(); }, [load]);

  const handleAddEntries = async (form: AddEntryForm): Promise<LineResult[]> => {
    const lines = form.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

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

    // Reload if at least one succeeded
    const anySuccess = results.some((r) => r.status === 'fulfilled');
    if (anySuccess) {
      if (form.list_type !== listType) setListType(form.list_type);
      else await load();
    }

    // Close only if all succeeded
    if (errors.length === 0) setDialogOpen(false);

    return errors;
  };

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selection.ids).map(Number);
    await IpAPI.deleteEntries(ids);
    setSelection({ type: 'include', ids: new Set() });
    await load();
  }, [selection, load]);

  const columns: GridColDef[] = [
    { field: 'ip',           headerName: 'IP / CIDR',  flex: 1 },
    { field: 'list_type',    headerName: 'List',        width: 110 },
    { field: 'entry_type',   headerName: 'Type',        width: 110 },
    { field: 'country_code', headerName: 'Country',     width: 100 },
    {
      field: 'blocked_at',
      headerName: 'Blocked at',
      width: 160,
      valueFormatter: ({ value }) =>
        value ? new Date(value).toLocaleString() : '—',
    },
    {
      field: 'created_at',
      headerName: 'Added',
      width: 160,
      valueFormatter: ({ value }) =>
        value ? new Date(value).toLocaleString() : '—',
    },
  ];

  const toolbarSlots = useMemo(() => ({ toolbar: CustomToolbar }), []);

  const toolbarSlotProps = useMemo(() => ({
    toolbar: {
      onAdd: () => setDialogOpen(true),
      onDeleteSelected: handleDeleteSelected,
      selectedCount: selection.ids.size,
    },
  }), [handleDeleteSelected, selection.ids.size]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Access Control
      </Typography>

      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          getRowId={(row) => row.id}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          showToolbar
          slots={toolbarSlots}
          slotProps={toolbarSlotProps}
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