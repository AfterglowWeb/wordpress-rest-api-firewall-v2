import { useState } from 'react';
import {
	Box,
	Paper,
	Typography,
	Switch,
	Stack,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Divider,
} from '@mui/material';

import type { AuthSettings } from '@app-types/auth';

export default function Authentication(): JSX.Element {
	const [settings, setSettings] = useState<AuthSettings>({
		auth_enforce: false,
		auth_methods: 'wp_auth',
		auth_jwt_algorithm: 'RS256',
		auth_jwt_public_key: '',
		auth_jwt_audience: '',
		auth_jwt_issuer: '',
		auth_user_ids: 0,
	});

	const update = <K extends keyof AuthSettings>(
		key: K,
		value: AuthSettings[K]
	) => {
		setSettings((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	return (
		<Box p={3}>
			<Typography variant="h5" fontWeight={600} mb={2}>
				Authentication
			</Typography>

			{/* CORE AUTH */}
			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="h6" mb={2}>
					Core Settings
				</Typography>

				<Stack spacing={2}>
					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Box>
							<Typography fontWeight={600}>
								Require authentication for all API routes
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Force authentication unless route is explicitly public
							</Typography>
						</Box>

						<Switch
							checked={settings.auth_enforce}
							onChange={(e) =>
								update('auth_enforce', e.target.checked)
							}
						/>
					</Box>

					<FormControl fullWidth>
						<InputLabel>Authentication method</InputLabel>
						<Select
							value={settings.auth_methods}
							label="Authentication method"
							onChange={(e) =>
								update('auth_methods', e.target.value as any)
							}
						>
							<MenuItem value="wp_auth">WordPress Auth</MenuItem>
							<MenuItem value="jwt">JWT</MenuItem>
						</Select>
					</FormControl>
				</Stack>
			</Paper>

			{/* JWT SECTION */}
			{settings.auth_methods === 'jwt' && (
				<Paper sx={{ p: 2, mb: 2 }}>
					<Typography variant="h6" mb={2}>
						JWT Configuration
					</Typography>

					<Stack spacing={2}>
						<FormControl fullWidth>
							<InputLabel>JWT Algorithm</InputLabel>
							<Select
								value={settings.auth_jwt_algorithm}
								label="JWT Algorithm"
								onChange={(e) =>
									update(
										'auth_jwt_algorithm',
										e.target.value as any
									)
								}
							>
								<MenuItem value="RS256">RS256</MenuItem>
								<MenuItem value="RS384">RS384</MenuItem>
								<MenuItem value="RS512">RS512</MenuItem>
								<MenuItem value="HS256">HS256</MenuItem>
								<MenuItem value="HS384">HS384</MenuItem>
								<MenuItem value="HS512">HS512</MenuItem>
								<MenuItem value="ES256">ES256</MenuItem>
							</Select>
						</FormControl>

						<TextField
							label="JWT Public Key"
							multiline
							minRows={4}
							value={settings.auth_jwt_public_key}
							onChange={(e) =>
								update('auth_jwt_public_key', e.target.value)
							}
						/>

						<TextField
							label="JWT Audience"
							value={settings.auth_jwt_audience}
							onChange={(e) =>
								update('auth_jwt_audience', e.target.value)
							}
						/>

						<TextField
							label="JWT Issuer"
							value={settings.auth_jwt_issuer}
							onChange={(e) =>
								update('auth_jwt_issuer', e.target.value)
							}
						/>
					</Stack>
				</Paper>
			)}

			{/* ACCESS CONTROL */}
			<Paper sx={{ p: 2 }}>
				<Typography variant="h6" mb={2}>
					User Restrictions
				</Typography>

				<TextField
					label="Authorized user IDs (temporary single value)"
					type="number"
					value={settings.auth_user_ids}
					onChange={(e) =>
						update('auth_user_ids', Number(e.target.value))
					}
					helperText="Later we’ll upgrade this to a multi-user selector"
					fullWidth
				/>
			</Paper>

			<Divider sx={{ my: 3 }} />

			<Typography variant="body2" color="text.secondary">
				These settings will be synced with SettingsRepository.php
			</Typography>
		</Box>
	);
}