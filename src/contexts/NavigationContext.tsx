import type { PropsWithChildren } from 'react';
import {
	createContext,
	useContext,
	useState,
} from 'react';

export type PanelKey = 'dashboard' | 'authentication' | 'access-control' | 'rate-limiting' | 'routes' | 'wordpress' | 'logs';

type NavigationContextValue = {
	panel: PanelKey;
	setPanel: (panel: PanelKey) => void;
};

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: PropsWithChildren): JSX.Element {
	const [panel, setPanel] = useState<PanelKey>('dashboard');

	return (
		<NavigationContext.Provider value={{ panel, setPanel }}>
			{children}
		</NavigationContext.Provider>
	);
}

export function useNavigation(): NavigationContextValue {
	const ctx = useContext(NavigationContext);

	if (!ctx) {
		throw new Error('useNavigation must be used within NavigationProvider');
	}

	return ctx;
}