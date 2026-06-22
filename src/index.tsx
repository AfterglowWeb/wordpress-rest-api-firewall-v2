import { createRoot } from '@wordpress/element';

import App from './App';
<<<<<<< HEAD
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
=======
import { type AdminData } from '@app-types/admin';
import { AdminDataProvider } from '@contexts/AdminDataContext';

document.addEventListener( 'DOMContentLoaded', function () {
	const container = document.getElementById( 'bromate-rest-api-firewall-page' );
	console.log( '[Bromate] container', container );


	const raw = window.bromateRestApiFirewall ;
	const adminData: AdminData = {
		...raw,
		plugin_name: raw.plugin?.name ?? raw.plugin_name,
		plugin_version: raw.plugin?.version ?? raw.plugin_version,
	};

	if ( container && adminData ) {
	
		const root = createRoot( container );

		root.render(
			<AdminDataProvider adminData={adminData}>
				<App />
			</AdminDataProvider>
		);

	}
});


>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
