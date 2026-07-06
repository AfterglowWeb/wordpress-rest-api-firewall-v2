export interface AdminData {
	ajaxurl?: string;
	nonce?: string;
	plugin_name?: string;
	plugin_version?: string;
	user_id: number;
	username: string;
	email: string;
	is_user_enabled: boolean;
	is_profile_page: boolean;
	show_dialog: boolean;
	settings: object;
}