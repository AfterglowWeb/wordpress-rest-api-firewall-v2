import { createRoot } from '@wordpress/element';

import App from './App';
import AppTheme from './AppTheme';

import { AdminDataProvider, type AdminData } from '@contexts/AdminDataContext';
import { DocumentationProvider } from '@contexts/DocumentationContext';

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById(
		'bromate-rest-api-firewall-page'
	);

	if (!container) {
		return;
	}

	const adminData:AdminData | undefined = window.restApiFirewallAdminData;

	createRoot(container).render(
		<AdminDataProvider adminData={adminData}>
			<DocumentationProvider>
				<AppTheme>
					<App />
				</AppTheme>
			</DocumentationProvider>
		</AdminDataProvider>
	);
});