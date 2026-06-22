import { createContext } from 'react';
import type { RouteNode, ToggleableSettingKey } from '@app-types/routes';

export type RoutePolicyTreeContextType = {
	toggleSetting: (id: string, key: ToggleableSettingKey) => void;
	getNode: (id: string) => RouteNode | undefined;
};

export const RoutePolicyTreeContext =
	createContext<RoutePolicyTreeContextType | null>(
		null
	);