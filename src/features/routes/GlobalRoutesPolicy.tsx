import Divider from '@mui/material/Divider';
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
	const toggleHiddenRoute = (
		route: 'users' | 'oembed' | 'batch'
	) => {
		const current =
			settings.routes_policy_hidden_routes ?? [];

		const next = current.includes(route)
			? current.filter((r) => r !== route)
			: [...current, route];

		onChange('routes_policy_hidden_routes', next);
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
		<Stack spacing={2} maxWidth={640}>
			{/* ROUTES */}

			<Stack spacing={2}>
				<Stack spacing={0}>
					<Typography
						variant="subtitle1"
						fontWeight={600}
					>
						Disable Routes
					</Typography>

					<Typography
						variant="body2"
						color="text.secondary"
					>
						WordPress Core routes require
						specific handling to be properly
						disabled.
					</Typography>
				</Stack>

				<FormControl>
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={settings.routes_policy_hidden_routes.includes(
									'users'
								)}
								onChange={() =>
									toggleHiddenRoute(
										'users'
									)
								}
							/>
						}
						label="Disable /wp/v2/users/* Routes"
					/>
				</FormControl>

				<FormControl>
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={settings.routes_policy_hidden_routes.includes(
									'oembed'
								)}
								onChange={() =>
									toggleHiddenRoute(
										'oembed'
									)
								}
							/>
						}
						label="Disable oembed/1.0/* Routes"
					/>
				</FormControl>

				<FormControl>
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={settings.routes_policy_hidden_routes.includes(
									'batch'
								)}
								onChange={() =>
									toggleHiddenRoute(
										'batch'
									)
								}
							/>
						}
						label="Disable batch/v1 Routes"
					/>
				</FormControl>
			</Stack>

			<Divider />

			{/* METHODS */}

			<Stack spacing={2}>
				<Stack spacing={0}>
					<Typography
						variant="subtitle1"
						fontWeight={600}
					>
						Disable HTTP Methods
					</Typography>

					<Typography
						variant="body2"
						color="text.secondary"
					>
						Blocks an HTTP method for all
						traffic to this application —
						anonymous and authenticated
						alike.
					</Typography>
				</Stack>

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

			<Divider />

			{/* POST TYPES */}

			<Stack spacing={2}>
				<Stack spacing={0}>
					<Typography
						variant="subtitle1"
						fontWeight={600}
					>
						Disable Post Types and
						Taxonomies
					</Typography>

					<Typography
						variant="body2"
						color="text.secondary"
					>
						Disables post types and
						taxonomies globally across all
						routes.
					</Typography>
				</Stack>

				<ObjectTypeSelect
					label="Disable Object Types"
					value={
						settings.routes_policy_hidden_post_types
					}
					onChange={(value: string[]) =>
						onChange(
							'routes_policy_hidden_post_types',
							value
						)
					}
				/>
			</Stack>
		</Stack>
	);
}