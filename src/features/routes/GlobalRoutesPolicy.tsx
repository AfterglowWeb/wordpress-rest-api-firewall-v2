import { useState, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import ObjectTypeSelect from '@components/ObjectTypeSelect';

import type { RoutesSettings } from '@app-types/routes';

const HTTP_METHODS = [
	'GET',
	'POST',
	'PUT',
	'DELETE',
	'PATCH',
] as const;

type Props = {
	settings: RoutesSettings;
	onChange: <K extends keyof RoutesSettings>(
		key: K,
		value: RoutesSettings[K]
	) => void;
};

export default function GlobalRoutesPolicy({
	settings,
	onChange,
}: Props): JSX.Element {
	
	// Check if security defaults are currently applied
	const checkSecurityDefaultsApplied = useMemo(() => {
		const hasDefaultHiddenRoutes = !! settings.routes_policy_default_hidden_routes;
		const hasDelete = settings.routes_policy_hidden_methods?.includes('delete') ?? false;
		const hasPut = settings.routes_policy_hidden_methods?.includes('put') ?? false;
		const is403 = settings.routes_policy_hidden_response_code === '403';
		
		return hasDefaultHiddenRoutes && hasDelete && hasPut && is403;
	}, [
		settings.routes_policy_default_hidden_routes,
		settings.routes_policy_hidden_methods,
		settings.routes_policy_hidden_response_code
	]);
	
	const [securityDefaultsApplied, setSecurityDefaultsApplied] = useState(
		checkSecurityDefaultsApplied
	);

	// Update the state whenever settings change
	useMemo(() => {
		setSecurityDefaultsApplied(checkSecurityDefaultsApplied);
	}, [checkSecurityDefaultsApplied]);
	
	const applySecurityDefaults = () => {
		const defaults = {
			routes_policy_default_hidden_routes: true,
			routes_policy_hidden_methods: ['delete', 'put', 'patch'],
			routes_policy_hidden_wp_objects: [],
			routes_policy_hidden_response_code: '403' as const,
		};
		
		Object.entries(defaults).forEach(([key, value]) => {
			onChange(key as keyof RoutesSettings, value);
		});
	};

	const removeSecurityDefaults = () => {
		// Clear the security defaults
		onChange('routes_policy_default_hidden_routes', false);
		onChange('routes_policy_hidden_methods', []);
		onChange('routes_policy_hidden_wp_objects', []);
		onChange('routes_policy_hidden_response_code', '404' as const);
	};

	const toggleSecurityDefaults = () => {
		if (securityDefaultsApplied) {
			removeSecurityDefaults();
		} else {
			applySecurityDefaults();
		}
	};

	const toggleMethod = (method: string) => {
		const key = method.toLowerCase();

		const current =
			settings.routes_policy_hidden_methods ?? [];

		const next = current.includes(key)
			? current.filter((m) => m !== key)
			: [...current, key];

		onChange('routes_policy_hidden_methods', next);
	};

	return (
		<Stack spacing={2}>
			<Alert severity="info">
				These settings can be overridden on a per-route basis in Route Policy Tree.
			</Alert>

			<Stack spacing={2}>
				<FormControl>
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={securityDefaultsApplied}
								onChange={toggleSecurityDefaults}
							/>
						}
						label="Apply Security Defaults"
					/>
				</FormControl>
				<Typography variant="caption" color="text.secondary">
					Disables /wp/v2/users/*, oembed/1.0/*, batch/v1/*, /wp-site-health/v1/*, /wp-abilities/v1/* routes and DELETE, PUT, PATCH methods.
				</Typography>
			</Stack>

			<Stack spacing={2}>
				<Typography variant="subtitle1" fontWeight={600}>
					Disable HTTP Methods
				</Typography>
				<Stack
					direction="row"
					gap={1}
					flexWrap="wrap"
				>
					{HTTP_METHODS.map((method) => (
						<FormControlLabel
							key={method}
							label={method}
							sx={{
								m: 0,
								px: 1.5,
								py: 0.5,
							}}
							control={
								<Switch
									size="small"
									checked={settings.routes_policy_hidden_methods.includes(
										method.toLowerCase()
									)}
									onChange={() =>
										toggleMethod(
											method
										)
									}
								/>
							}
						/>
					))}
				</Stack>
			</Stack>

			<Stack spacing={2}>
				<Typography variant="subtitle1" fontWeight={600}>
					Disable Post Types and Taxonomies
				</Typography>

				<ObjectTypeSelect
					label="Disable Object Types"
					value={
						settings.routes_policy_hidden_wp_objects
					}
					onChange={(value: string[]) =>
						onChange(
							'routes_policy_hidden_wp_objects',
							value
						)
					}
				/>
			</Stack>
		</Stack>
	);
}