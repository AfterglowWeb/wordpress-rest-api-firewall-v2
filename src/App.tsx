import { DialogProvider } from '@contexts/DialogContext';
import { NavigationProvider } from '@contexts/NavigationContext';
import AdminLayout from '@layouts/AdminLayout';

export default function App() {
	return (
		<DialogProvider>
			<NavigationProvider>
				<AdminLayout />
			</NavigationProvider>
		</DialogProvider>
	);
}