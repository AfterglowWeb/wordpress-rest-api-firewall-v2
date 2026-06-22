export interface AdminData {
	// localized values from PHP (may be present initially)
	ajaxurl?: string;
	nonce?: string;
	plugin?: {
		name?: string;
		version?: string;
	};
	// legacy flat plugin fields kept for compatibility with existing components
	plugin_name?: string;
	plugin_version?: string;

	// persisted settings passed from PHP runtime
	settings?: Record<string, unknown>;

	// fetched settings from the REST API / AJAX call
	options?: Record<string, unknown>;

	currentUser?: {
		id: number;
		login: string;
	};
}