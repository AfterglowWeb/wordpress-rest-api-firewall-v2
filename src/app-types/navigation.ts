export type PanelKey =
	| 'dashboard'
	| 'authentication'
	| 'firewall'
	| 'login-hardening'
	| 'routes'
	| 'wordpress'
	| 'logs';

export interface PanelDefinition {
    key: PanelKey;
    label: string;
    icon: string;
}