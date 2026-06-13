import { DialogProvider } from '@contexts/DialogContext';
import { NavigationProvider } from '@contexts/NavigationContext';
import ConfirmDialog from '@components/ConfirmDialog';
import AdminLayout from '@layouts/AdminLayout';

export default function App() {
	return (
		<DialogProvider>
			<NavigationProvider>
				<AdminLayout />
				<ConfirmDialog />
			</NavigationProvider>
		</DialogProvider>
	);
}