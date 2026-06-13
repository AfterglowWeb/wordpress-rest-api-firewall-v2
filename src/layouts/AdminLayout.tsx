import Box from '@mui/material/Box';

import Navigation from '@components/Navigation';

import { useNavigation } from '@contexts/NavigationContext';

import Dashboard from '@pages/Dashboard';
import Authentication from '@pages/Authentication';
import AccessControl from '@pages/AccessControl';
import RateLimiting from '@pages/RateLimiting';
import Routes from '@pages/Routes';
import Wordpress from '@pages/Wordpress';
import Logs from '@pages/Logs';

export default function AdminLayout() {
	const { panel } = useNavigation();

	return (
		<Box display="flex">
			<Navigation />

			<Box flex={1}>
				{panel === 'dashboard' && <Dashboard />}

				{panel === 'authentication' && (
					<Authentication />
				)}

				{panel === 'access-control' && (
					<AccessControl />
				)}

				{panel === 'rate-limiting' && (
					<RateLimiting />
				)}

				{panel === 'routes' && <Routes />}

				{panel === 'wordpress' && <Wordpress />}

				{panel === 'logs' && <Logs />}
			</Box>
		</Box>
	);
}