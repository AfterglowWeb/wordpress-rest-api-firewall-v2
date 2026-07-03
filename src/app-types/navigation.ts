export type PanelKey =
	| 'dashboard'
	| 'authentication'
	| 'firewall'
	| 'login-hardening'
	| 'routes'
	| 'models'
	| 'wordpress'
	| 'logs';

export interface PanelDefinition {
    key: PanelKey;
    label: string;
    icon: string;
}