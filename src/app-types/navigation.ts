export type PanelKey =
	| 'dashboard'
	| 'authentication'
	| 'rate-limiting'
	| 'access-control'
	| 'login-hardening'
	| 'routes'
	| 'wordpress'
	| 'logs';

export interface PanelDefinition {
    key: PanelKey;
    label: string;
    icon: string;
}