import { useEffect, useState, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

import type { RoutesSettings } from '@app-types/routes';

import GlobalRoutesPolicy from '@features/routes/GlobalRoutesPolicy';
import RoutesPolicyTree from '@features/routes/RoutesPolicyTree';

import { RoutesAPI } from '@services/routes';

export default function Routes(): JSX.Element {
	const [loading, setLoading] = useState(true);

	const [settings, setSettings] =
		useState<RoutesSettings>({
			routes_policy_enabled: false,
			routes_policy_rules: {
				nodes: [],
				routes: [],
			},
			routes_policy_hidden_routes: [],
			routes_policy_hidden_methods: [],
			routes_policy_hidden_post_types: [],
			routes_policy_hidden_response_code: '404',
		});

	const update = useCallback(
		<K extends keyof RoutesSettings>(
			key: K,
			value: RoutesSettings[K]
		) => {
			setSettings((prev) => ({
				...prev,
				[key]: value,
			}));
		},
		[]
	);

	const loadSettings = useCallback(async () => {
		try {
			const data = await RoutesAPI.getRoutes();

			setSettings(data.routes_settings);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadSettings();
	}, [loadSettings]);

	if (loading) {
		return (
			<Stack
				height="100%"
				alignItems="center"
				justifyContent="center"
			>
				<CircularProgress />
			</Stack>
		);
	}

	return (
		<Stack py={4} flexGrow={1} spacing={3}>
			<Stack px={4} spacing={3}>
				<Alert severity="info" sx={{ maxWidth: 800 }}>
					These settings apply globally to all routes.
					They can be overridden on a per-route basis
					inside the route policy tree.
				</Alert>

				<GlobalRoutesPolicy
					settings={settings}
					onChange={update}
				/>
			</Stack>

			<Stack px={4} flexGrow={1}>
				<RoutesPolicyTree
					settings={settings}
					onChange={setSettings}
				/>
			</Stack>
		</Stack>
	);
}