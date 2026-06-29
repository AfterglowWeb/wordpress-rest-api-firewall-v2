import { useEffect, useState, useCallback } from '@wordpress/element';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import type { RoutesSettings, RouteNode } from '@app-types/routes';

import GlobalRoutesPolicy from '@features/routes/GlobalRoutesPolicy';
import RoutesPolicyTree from '@features/routes/RoutesPolicyTree';

import { RoutesAPI } from '@services/routes';


export default function Routes(): JSX.Element {
  	const [loading, setLoading] = useState(true);
	const [tree, setTree] = useState<RouteNode[]>([]);
	const [settings, setSettings] = useState<RoutesSettings>({
		routes_policy_enabled:              false,
		routes_policy_default_hidden_routes: false,
		routes_policy_hidden_methods:       [],
		routes_policy_hidden_wp_objects:    [],
		routes_policy_hidden_response_code: '404',
	});

  	const update = useCallback(
		<K extends keyof RoutesSettings>(key: K, value: RoutesSettings[K]) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[]
	);

	const loadSettings = useCallback(async () => {
		try {
		const data = await RoutesAPI.getRoutes();
		setTree(data.tree); 
		// settings globaux à charger séparément si besoin
		} finally {
		setLoading(false);
		}
	}, []);

	useEffect(() => { void loadSettings(); }, [loadSettings]);

	if (loading) {
		return (
		<Stack height="100%" alignItems="center" justifyContent="center">
			<CircularProgress />
		</Stack>
		);
	}

	return (
		<Stack flexGrow={1} spacing={3}>
			<Paper sx={{p:2}} elevation={0}>
				<GlobalRoutesPolicy settings={settings} onChange={update} />
			</Paper>
			<Paper sx={{p:2}} elevation={0}>
				<RoutesPolicyTree tree={tree} onChange={setTree} />
			</Paper>
			<Alert severity="info">
				Route Policy Tree settings take priority over global settings.
			</Alert>
		</Stack>
	);
}