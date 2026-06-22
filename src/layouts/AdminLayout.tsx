import Stack from '@mui/material/Stack';

import Navigation from '@components/Navigation';

import { useNavigation } from '@contexts/NavigationContext';

import ConfirmDialog from '@components/ConfirmDialog';

import Dashboard from '@pages/Dashboard';
import Authentication from '@pages/Authentication';
import AccessControl from '@pages/AccessControl';
import RateLimiting from '@pages/RateLimiting';
import Routes from '@pages/Routes';
//import WordPress from '@pages/WordPress';
//import Logs from '@pages/Logs';

export default function AdminLayout() {
	const { panel } = useNavigation();

	return (
		<Stack>
			<Navigation />

			<Stack>
				{panel === 'dashboard' && <Dashboard />}

					
					{panel === 'rate-limiting' && (
						<RateLimiting />
					)}

					{panel === 'access-control' && (
						<AccessControl />
					)}


					{panel === 'routes' && <Routes />}

				{/*panel === 'wordpress' && <WordPress />*/}

				{/*panel === 'logs' && <Logs />*/}
			</Stack>
		</Stack>
	);
}