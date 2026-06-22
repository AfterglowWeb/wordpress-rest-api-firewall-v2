import type { PanelDefinition, PanelKey } from '@app-types/navigation';

declare const bromateRestApiFirewall: {
    nonce: string;
    ajaxurl: string;
    options: Record<string, unknown>;
    plugin: { name: string; version: string };
    currentUser: { id: number; login: string };
    panels: Record<string, { label: string; icon: string }>;
};

export function parseLocalizedPanels(): PanelDefinition[] {
    const raw = bromateRestApiFirewall?.panels ?? {};

    return Object.entries( raw ).map( ( [ key, value ] ) => ( {
        key: key as PanelKey,
        label: value.label,
        icon: value.icon,
    } ) );
}

export function getLocalizedData() {
    return bromateRestApiFirewall;
}