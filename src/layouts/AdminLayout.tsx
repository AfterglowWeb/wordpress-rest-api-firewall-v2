import Stack from '@mui/material/Stack';

import Navigation from '@components/Navigation';
;
import { useNavigation } from '@contexts/NavigationContext';

import Dashboard from '@pages/Dashboard';
import Authentication from '@pages/Authentication';
import Firewall from '@pages/Firewall';
import Routes from '@pages/Routes';
//import WordPress from '@pages/WordPress';
import Logs from '@pages/Logs';

export default function AdminLayout() {
	const { panel } = useNavigation();

	return (
		<Stack>
			<Navigation>
				<Stack>
					{panel === 'dashboard' && <Dashboard />}

					{panel === 'authentication' && <Authentication />}
					
					{panel === 'firewall' && <Firewall />}

					{panel === 'routes' && <Routes />}

					{/*panel === 'wordpress' && <WordPress />*/}

					{panel === 'logs' && <Logs />}
				</Stack>
			</Navigation>

			
		</Stack>
	);
}