export type SecurityModuleKey =
	| 'authentication'
	| 'access-control'
	| 'rate-limiting'
	| 'routes'
	| 'wordpress'
	| 'logs';

export type SecurityModule = {
	key: SecurityModuleKey;
	title: string;
	description: string;
	enabled: boolean;
};