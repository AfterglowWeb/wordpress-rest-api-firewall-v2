export interface AdminData {
	ajaxurl?: string;
	nonce?: string;
	plugin_name?: string;
	plugin_version?: string;
	settings?: Record<string, unknown>;
	options?: Record<string, unknown>;
	currentUser?: {
		id: number;
		login: string;
	};
}