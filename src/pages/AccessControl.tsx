import { useEffect, useState } from '@wordpress/element';
import {
  Box, Paper, Typography, Button, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  DataGrid, GridColDef, useGridApiContext, type GridRowSelectionModel,
} from '@mui/x-data-grid';
import type { ToolbarProps } from '@mui/x-data-grid';
import { IpAPI, type IpEntry, type ListType } from '@services/ip';

type EntryType = 'ip' | 'cidr' | 'country';

interface AddEntryForm {
  value: string;       // IP, CIDR, or ISO country code
  entry_type: EntryType;
  list_type: ListType;
  expires_at: string;  // '' = never
}

const EMPTY_FORM: AddEntryForm = {
  value: '',
  entry_type: 'ip',
  list_type: 'blacklist',
  expires_at: '',
};

interface CustomToolbarProps extends ToolbarProps {
  listType: ListType;
  onListTypeChange: (v: ListType) => void;
  onAdd: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

function CustomToolbar() {
	const apiRef = useGridApiContext();
  
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{ p: 1 }}
    >
      {/*<ToggleButtonGroup
        value={listType}
        exclusive
        size="small"
        onChange={(_, v) => v && onListTypeChange(v)}
      >
        <ToggleButton value="blacklist">Blacklist</ToggleButton>
        <ToggleButton value="whitelist">Whitelist</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          color="error"
          variant="outlined"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
        >
          Delete selected
        </Button>
        <Button size="small" variant="contained" onClick={onAdd}>
          Add entry
        </Button>
      </Stack>*/}
    </Stack>
  );
}

interface AddEntryDialogProps {
  open: boolean;
  defaultListType: ListType;
  onSave: (form: AddEntryForm) => Promise<void>;
  onClose: () => void;
}

function AddEntryDialog({
  open,
  defaultListType,
  onSave,
  onClose,
}: AddEntryDialogProps) {
  const [form, setForm] = useState<AddEntryForm>({
    ...EMPTY_FORM,
    list_type: defaultListType,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...EMPTY_FORM, list_type: defaultListType });
  }, [open, defaultListType]);

  const update = <K extends keyof AddEntryForm>(key: K, value: AddEntryForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const placeholder =
    form.entry_type === 'ip'      ? '203.0.113.42' :
    form.entry_type === 'cidr'    ? '203.0.113.0/24' :
                                    'CN';

  const label =
    form.entry_type === 'country' ? 'ISO country code' : 'IP / CIDR';

  const isValid = form.value.trim() !== '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add access control entry</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>

          <FormControl fullWidth>
            <InputLabel>List</InputLabel>
            <Select
              value={form.list_type}
              label="List"
              onChange={(e) => update('list_type', e.target.value as ListType)}
            >
              <MenuItem value="blacklist">Blacklist</MenuItem>
              <MenuItem value="whitelist">Whitelist</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Entry type</InputLabel>
            <Select
              value={form.entry_type}
              label="Entry type"
              onChange={(e) => update('entry_type', e.target.value as EntryType)}
            >
              <MenuItem value="ip">Single IP</MenuItem>
              <MenuItem value="cidr">CIDR range</MenuItem>
              <MenuItem value="country">Country</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label={label}
            placeholder={placeholder}
            value={form.value}
            onChange={(e) =>
              update(
                'value',
                form.entry_type === 'country'
                  ? e.target.value.toUpperCase().slice(0, 2)
                  : e.target.value
              )
            }
            inputProps={form.entry_type === 'country' ? { maxLength: 2 } : undefined}
            fullWidth
          />

          <TextField
            label="Expires at"
            type="date"
            value={form.expires_at}
            onChange={(e) => update('expires_at', e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Leave empty for permanent entry"
            fullWidth
          />

        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!isValid || saving}
        >
          Add entry
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AccessControl(): JSX.Element {
  const [listType, setListType]   = useState<ListType>('blacklist');
  const [rows, setRows]           = useState<IpEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selection, setSelection] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

  const load = async () => {
    const res = await IpAPI.getEntries(listType);
    setRows(res.entries);
  };

  useEffect(() => { load(); }, [listType]);

  const handleAddEntry = async (form: AddEntryForm) => {
    await IpAPI.addEntry(form.value, form.list_type);

    // Switch to the list the user just added to
    if (form.list_type !== listType) setListType(form.list_type);
    else await load();
    setDialogOpen(false);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selection.ids).map(Number);
    await IpAPI.deleteEntries(ids);
    setSelection({ type: 'include', ids: new Set() });
    await load();
  };

  const columns: GridColDef[] = [
    { field: 'ip',           headerName: 'IP / CIDR / Country', flex: 1 },
    { field: 'list_type',    headerName: 'List',    width: 110 },
    { field: 'entry_type',   headerName: 'Type',    width: 110 },
    { field: 'country_code', headerName: 'Country', width: 100 },
    {
      field: 'expires_at',
      headerName: 'Expires',
      width: 160,
      valueFormatter: ({ value }) =>
        value ? new Date(value).toLocaleString() : '—',
    },
  ];

  const hasSelection = Array.from(selection.ids).length > 0;

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
          slots={{
            toolbar: CustomToolbar,
          }}
        />
      </Paper>

      <AddEntryDialog
        open={dialogOpen}
        defaultListType={listType}
        onSave={handleAddEntry}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}