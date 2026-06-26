import { createRoot } from '@wordpress/element';

import App from './App';
import AppTheme from './AppTheme';

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