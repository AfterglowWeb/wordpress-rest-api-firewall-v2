import { useEffect, useState } from 'react';
import {
	Box,
	Paper,
	Typography,
	Button,
	Stack,
} from '@mui/material';

import {
	DataGrid,
	GridColDef,
    type GridRowSelectionModel
} from '@mui/x-data-grid';

import { IpAPI, IpEntry, ListType } from '@services/ip';



export default function AccessControl(): JSX.Element {
	const [listType, setListType] = useState<ListType>('blacklist');
	const [rows, setRows] = useState<IpEntry[]>([]);
    const [selection, setSelection] = useState<GridRowSelectionModel>({
        type: 'include',
        ids: new Set(),
    });

	const load = async () => {
		const res = await IpAPI.getEntries(listType);
		setRows(res.entries);
	};

	useEffect(() => {
		load();
	}, [listType]);

	const columns: GridColDef[] = [
		{ field: 'ip', headerName: 'IP / CIDR', flex: 1 },
		{ field: 'list_type', headerName: 'List', width: 120 },
		{ field: 'entry_type', headerName: 'Type', width: 120 },
		{ field: 'country_code', headerName: 'Country', width: 120 },
		{ field: 'expires_at', headerName: 'Expires', width: 180 },
	];

	const handleDeleteSelected = async () => {
        const selectedIds = Array.from(selection.ids).map(Number);
		await IpAPI.deleteEntries(selectedIds);
		setSelection({
            type: 'include',
            ids: new Set(),
        });
		await load();
	};

	return (
		<Box p={3}>
			<Typography variant="h5" fontWeight={600} mb={2}>
				Access Control
			</Typography>

			<Stack direction="row" spacing={1} mb={2}>
				<Button
					variant={listType === 'blacklist' ? 'contained' : 'outlined'}
					onClick={() => setListType('blacklist')}
				>
					Blacklist
				</Button>

				<Button
					variant={listType === 'whitelist' ? 'contained' : 'outlined'}
					onClick={() => setListType('whitelist')}
				>
					Whitelist
				</Button>

				<Button
					color="error"
					onClick={handleDeleteSelected}
					disabled={!Array.from(selection.ids).length}
				>
					Delete Selected
				</Button>
			</Stack>

			<Paper sx={{ height: 600 }}>
				<DataGrid
                    rowSelectionModel={selection}
					onRowSelectionModelChange={setSelection}
					rows={rows}
					getRowId={(row) => row.id}
					columns={columns}
					checkboxSelection
					disableRowSelectionOnClick
				/>
			</Paper>
		</Box>
	);
}