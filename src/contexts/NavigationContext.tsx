import { createContext, useContext, useState } from '@wordpress/element';
import type { PanelKey, PanelDefinition } from '@app-types/navigation';
import { parseLocalizedPanels } from '@app-utils/parseLocalizedPanels';
import { buildMenuItems } from '@app-utils/buildMenuItems';
import type { MenuItem } from '@app-utils/buildMenuItems';

type NavigationContextValue = {
    panel: PanelKey;
    setPanel: ( panel: PanelKey ) => void;
    panels: PanelDefinition[];
    menuItems: MenuItem[];
    navigateGuarded: ( key: PanelKey ) => void;
};

const NavigationContext = createContext<NavigationContextValue | undefined>( undefined );

type NavigationProviderProps = {
    children?: JSX.Element;
};

export function NavigationProvider( { children }: NavigationProviderProps ): JSX.Element {
    const panels = parseLocalizedPanels();
    const firstKey = panels[ 0 ]?.key ?? 'auth';

    const [ panel, setPanel ] = useState<PanelKey>( firstKey );

    function navigateGuarded( key: PanelKey ): void {
        if ( panels.some( ( p ) => p.key === key ) ) {
            setPanel( key );
        }
    }

    const menuItems = buildMenuItems( panels );

    return (
        <NavigationContext.Provider value={ { panel, setPanel, panels, menuItems, navigateGuarded } }>
            { children }
        </NavigationContext.Provider>
    );
}

export function useNavigation(): NavigationContextValue {
    const ctx = useContext( NavigationContext );

    if ( ! ctx ) {
        throw new Error( 'useNavigation must be used within NavigationProvider' );
    }

    return ctx;
}