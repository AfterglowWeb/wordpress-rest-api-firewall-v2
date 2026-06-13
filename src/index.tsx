import { createRoot } from '@wordpress/element';

import App from './App';
import AppTheme from './AppTheme';

import { AdminDataProvider } from './contexts/AdminDataContext';
import { DocumentationProvider } from './contexts/DocumentationContext';

declare global {
	interface Window {
		restApiFirewallAdminData?: Record<string, unknown>;
		restApiFirewallPro?: Record<string, unknown>;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById(
		'bromate-rest-api-firewall-page'
	);

	if (!container) {
		return;
	}

	const adminData = window.restApiFirewallAdminData ?? {};

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