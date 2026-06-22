<<<<<<< HEAD
=======
import { useEffect } from '@wordpress/element';
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
import { DialogProvider } from '@contexts/DialogContext';
import { NavigationProvider } from '@contexts/NavigationContext';
import ConfirmDialog from '@components/ConfirmDialog';
import AdminLayout from '@layouts/AdminLayout';
<<<<<<< HEAD

export default function App() {
=======
import { SettingsAPI } from '@services/settings';
import { useAdminData } from '@contexts/AdminDataContext';

export default function App() {
	const { updateAdminData } = useAdminData();

	useEffect(() => {
		let isMounted = true;

		void (async () => {
			try {
				const settings = await SettingsAPI.readOptions();
				if (isMounted) {
					updateAdminData({ settings });
				}
			} catch (error) {
				console.error('Failed to load settings', error);
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [updateAdminData]);

>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
	return (
		<DialogProvider>
			<NavigationProvider>
				<AdminLayout />
				<ConfirmDialog />
			</NavigationProvider>
		</DialogProvider>
	);
<<<<<<< HEAD
}
=======
}
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
