import { useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography, Stack, Switch, Chip } from '@mui/material';
<<<<<<< HEAD
import type { SecurityModule } from '@types/modules';
=======
import type { SecurityModule } from '@app-types/modules';
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae

type StatCardProps = {
	title: string;
	value: string | number;
	description?: string;
};

function StatCard({ title, value, description }: StatCardProps) {
	return (
		<Paper
			elevation={2}
			sx={{
				p: 2,
				borderRadius: 2,
				height: '100%',
			}}
		>
			<Stack spacing={1}>
				<Typography variant="subtitle2" color="text.secondary">
					{title}
				</Typography>

				<Typography variant="h4" fontWeight={600}>
					{value}
				</Typography>

				{description && (
					<Typography variant="body2" color="text.secondary">
						{description}
					</Typography>
				)}
			</Stack>
		</Paper>
	);
}

export default function Dashboard(): JSX.Element {
	// Later: replace with real API data (logs, rate limit, blocked IPs, etc.)
	const stats = useMemo(
		() => [
			{
				title: 'Blocked Requests',
				value: 1284,
				description: 'Last 7 days',
			},
			{
				title: 'Active IP Blocks',
				value: 37,
				description: 'Currently blacklisted IPs',
			},
			{
				title: 'Rate Limit Violations',
				value: 92,
				description: 'Auto-blacklist triggers',
			},
			{
				title: 'Protected Routes',
				value: 14,
				description: 'Secured REST endpoints',
			},
		],
		[]
	);



	const [modules, setModules] = useState<SecurityModule[]>([
		{
			key: 'authentication',
			title: 'Authentication',
			description: 'JWT & Application Password protection',
			enabled: true,
		},
		{
			key: 'access-control',
			title: 'Access Control',
			description: 'IP filtering, CIDR, GeoIP blocking',
			enabled: true,
		},
		{
			key: 'rate-limiting',
			title: 'Rate Limiting',
			description: 'Request throttling & auto-blacklist',
			enabled: true,
		},
		{
			key: 'routes',
			title: 'Routes Control',
			description: 'Protect or disable REST routes',
			enabled: false,
		},
		{
			key: 'wordpress',
			title: 'WordPress Hardening',
			description: 'Disable XML-RPC, embeds, RSS, etc.',
			enabled: true,
		},
		{
			key: 'logs',
			title: 'Logs',
			description: 'Security events & violation tracking',
			enabled: true,
		},
	]);

	const toggleModule = (key: SecurityModule['key']) => {
		setModules((prev) =>
			prev.map((m) =>
				m.key === key ? { ...m, enabled: !m.enabled } : m
			)
		);
	};

	const enabledCount = useMemo(
		() => modules.filter((m) => m.enabled).length,
		[modules]
	);

	return (
        <>

<<<<<<< HEAD
		<Box p={3}>
			{/* Header */}
			<Box mb={3}>
=======
		<Box>
			{/* Header */}
			<Box>
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
				<Typography variant="h5" fontWeight={600}>
					Security Modules
				</Typography>

				<Typography variant="body2" color="text.secondary">
					Enable or disable firewall components
				</Typography>

				<Chip
					label={`${enabledCount}/${modules.length} active`}
					sx={{ mt: 1 }}
					color={enabledCount === modules.length ? 'success' : 'default'}
				/>
			</Box>

			<Grid container spacing={2}>
				{modules.map((module) => (
                    <Paper
                        elevation={2}
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            opacity: module.enabled ? 1 : 0.5,
                            transition: '0.2s',
                        }}
                        key={module.key}
                    >
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                        >
                            <Typography fontWeight={600}>
                                {module.title}
                            </Typography>

                            <Switch
                                checked={module.enabled}
                                onChange={() => toggleModule(module.key)}
                            />
                        </Stack>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            mt={1}
                        >
                            {module.description}
                        </Typography>

                        <Box mt={2}>
                            <Chip
                                size="small"
                                label={module.enabled ? 'Enabled' : 'Disabled'}
                                color={module.enabled ? 'success' : 'default'}
                            />
                        </Box>
                    </Paper>
				))}
			</Grid>
		</Box>

		<Box p={3}>
			{/* Header */}
			<Box mb={3}>
				<Typography variant="h5" fontWeight={600}>
					Stats
				</Typography>

				<Typography variant="body2" color="text.secondary">
					Overview of firewall activity and protection status
				</Typography>
			</Box>

			<Grid container spacing={2}>
				{stats.map((stat) => (
					<StatCard {...stat} />
				))}
			</Grid>

			<Box mt={4}>
				<Paper
					elevation={1}
					sx={{
						p: 2,
						borderRadius: 2,
						minHeight: 300,
					}}
				>
					<Typography variant="h6" gutterBottom>
						Activity Overview
					</Typography>

					<Typography variant="body2" color="text.secondary">
						(Charts will be connected to rate limiting + authentication events)
					</Typography>
				</Paper>
			</Box>
		</Box>
    </>
	);
}