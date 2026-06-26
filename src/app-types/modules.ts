export type SecurityModuleKey =
	| 'authentication'
	| 'firewall'
	| 'routes'
	| 'wordpress'
	| 'logs';

export type SecurityModule = {
	key: SecurityModuleKey;
	title: string;
	description: string;
	enabled: boolean;
};