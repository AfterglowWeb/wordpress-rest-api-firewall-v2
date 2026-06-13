import { apiRequest } from './api';

export type RoutesPolicy = {

};

export const IpAPI = {
	getRoutes: () => apiRequest<{ routes_policy: RoutesPolicy }>( 'bromate_get_routes' ),

	saveRoutes: (routes_policy: RoutesPolicy ) => apiRequest<{ routes_policy: RoutesPolicy }>('bromate_save_routes', { routes_policy }),

};