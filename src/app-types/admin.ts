export interface AdminData {
<<<<<<< HEAD
	settings?: Record<string, unknown>;
=======
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

>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
	currentUser?: {
		id: number;
		login: string;
	};
}