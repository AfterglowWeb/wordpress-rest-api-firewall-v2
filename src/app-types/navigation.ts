export type PanelKey =
	| 'dashboard'
	| 'authentication'
	| 'rate-limiting'
	| 'access-control'
	| 'routes'
	| 'wordpress'
<<<<<<< HEAD
	| 'logs';
=======
	| 'logs';

export interface PanelDefinition {
    key: PanelKey;
    label: string;
    icon: string; // Material icon name string from PHP
}
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
