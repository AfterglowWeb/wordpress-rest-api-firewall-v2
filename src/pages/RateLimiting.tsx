import { useState } from 'react';
import {
	Box,
	Paper,
	Typography,
	Switch,
	Stack,
	TextField,
	Divider,
	Chip,
} from '@mui/material';

import type { RateLimitSettings } from '@app-types/rate-limiting';

export default function RateLimiting(): JSX.Element {
	const [settings, setSettings] = useState<RateLimitSettings>({
		rate_limit_enabled: false,
		rate_limit_max: 30,
		rate_limit_time: 60,
		rate_limit_block_duration: 300,
		rate_limit_blacklist_threshold: 5,
		rate_limit_whitelist: [],
		rate_limit_countries: [],
		rate_limit_emergency_token_hash: '',
	});

	const update = <K extends keyof RateLimitSettings>(
		key: K,
		value: RateLimitSettings[K]
	) => {
		setSettings((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const parseArray = (value: string): string[] =>
		value
			.split(',')
			.map((v) => v.trim())
			.filter(Boolean);

	return (
		<Box p={3}>
			<Typography variant="h5" fontWeight={600} mb={2}>
				Rate Limiting
			</Typography>

			{/* ENABLE */}
			<Paper sx={{ p: 2, mb: 2 }}>
				<Stack
					direction="row"
					justifyContent="space-between"
					alignItems="center"
				>
					<Box>
						<Typography fontWeight={600}>
							Enable API rate limiting
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Protect against excessive API requests
						</Typography>
					</Box>

					<Switch
						checked={settings.rate_limit_enabled}
						onChange={(e) =>
							update('rate_limit_enabled', e.target.checked)
						}
					/>
				</Stack>
			</Paper>

			{/* CORE CONFIG */}
			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="h6" mb={2}>
					Limits
				</Typography>

				<Stack spacing={2}>
					<TextField
						label="Maximum requests"
						type="number"
						value={settings.rate_limit_max}
						onChange={(e) =>
							update('rate_limit_max', Number(e.target.value))
						}
					/>

					<TextField
						label="Time window (seconds)"
						type="number"
						value={settings.rate_limit_time}
						onChange={(e) =>
							update('rate_limit_time', Number(e.target.value))
						}
					/>

					<TextField
						label="Block duration (seconds)"
						type="number"
						value={settings.rate_limit_block_duration}
						onChange={(e) =>
							update(
								'rate_limit_block_duration',
								Number(e.target.value)
							)
						}
					/>

					<TextField
						label="Blacklist threshold"
						type="number"
						value={settings.rate_limit_blacklist_threshold}
						onChange={(e) =>
							update(
								'rate_limit_blacklist_threshold',
								Number(e.target.value)
							)
						}
					/>
				</Stack>
			</Paper>

			{/* WHITELIST */}
			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="h6" mb={2}>
					IP Whitelist
				</Typography>

				<TextField
					label="IPs or CIDR ranges (comma separated)"
					value={settings.rate_limit_whitelist.join(', ')}
					onChange={(e) =>
						update(
							'rate_limit_whitelist',
							parseArray(e.target.value)
						)
					}
					fullWidth
					helperText="Example: 192.168.1.1, 10.0.0.0/24"
				/>

				<Box mt={1}>
					{settings.rate_limit_whitelist.map((ip) => (
						<Chip
							key={ip}
							label={ip}
							sx={{ mr: 1, mt: 1 }}
						/>
					))}
				</Box>
			</Paper>

			{/* COUNTRIES */}
			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="h6" mb={2}>
					Blocked Countries
				</Typography>

				<TextField
					label="Country codes (comma separated)"
					value={settings.rate_limit_countries.join(', ')}
					onChange={(e) =>
						update(
							'rate_limit_countries',
							parseArray(e.target.value.toUpperCase())
						)
					}
					fullWidth
					helperText="Example: US, CN, RU, FR"
				/>
			</Paper>

			{/* EMERGENCY TOKEN */}
			<Paper sx={{ p: 2 }}>
				<Typography variant="h6" mb={2}>
					Emergency Access
				</Typography>

				<TextField
					label="Emergency bypass token hash"
					value={settings.rate_limit_emergency_token_hash}
					onChange={(e) =>
						update(
							'rate_limit_emergency_token_hash',
							e.target.value
						)
					}
					fullWidth
					helperText="Stored as hash (never expose raw token)"
				/>
			</Paper>

			<Divider sx={{ my: 3 }} />

			<Typography variant="body2" color="text.secondary">
				These settings will be synced with RateLimiter.php
			</Typography>
		</Box>
	);
}