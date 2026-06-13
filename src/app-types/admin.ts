export interface AdminData {
	settings?: Record<string, unknown>;
	currentUser?: {
		id: number;
		login: string;
	};
}