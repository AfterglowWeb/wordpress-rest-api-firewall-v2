import { apiRequest } from './api';
import type { RoutesSettings } from '@app-types/routes';

export const RoutesAPI = {
	getRoutes: () =>
		apiRequest<{ routes_settings: RoutesSettings }>(
			'bromate_get_routes_policy_tree'
		),

	saveRoutes: (settings: RoutesSettings) =>
		apiRequest<{
			routes_settings: RoutesSettings;
		}>(
			'bromate_save_routes_policy_tree',
			{
				routes_settings: settings,
			}
		),
};