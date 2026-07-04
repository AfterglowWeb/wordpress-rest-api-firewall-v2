export type PanelKey =
	| 'dashboard'
	| 'authentication'
	| 'routes'
	| 'models'
	| 'firewall'
	| 'login-hardening'
	| 'wordpress'
	| 'logs';

export interface PanelDefinition {
    key: PanelKey;
    label: string;
    icon: string;
}