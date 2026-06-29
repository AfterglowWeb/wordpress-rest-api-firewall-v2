import { apiRequest } from './api';
import type { RouteNode } from '@app-types/routes';

export const RoutesAPI = {
  getRoutes: () =>
    apiRequest<{ tree: RouteNode[] }>('bromate_get_routes_policy_tree'),

  saveRoutes: (tree: RouteNode[]) =>
    apiRequest<{ saved: boolean }>('bromate_save_routes_policy_tree', { tree: JSON.stringify(tree) }),
};