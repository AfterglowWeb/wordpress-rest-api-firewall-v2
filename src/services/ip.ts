import { apiRequest } from './api';

export type ListType = 'blacklist' | 'whitelist';

export type IpEntry = {
	id: number;
	ip: string;
	list_type: ListType;
	entry_type: 'manual' | 'auto';
	country_code?: string;
	country_name?: string;
	expires_at?: string | null;
	created_at?: string;
};

export const IpAPI = {
	getEntries: (list_type: ListType) =>
		apiRequest<{ entries: IpEntry[] }>(
			'bromate_add_ip_entries',
			{ list_type }
		),

	addEntry: (ip: string, list_type: ListType) =>
		apiRequest<{ entry: IpEntry }>('bromate_add_ip_entry', {
			ip,
			list_type,
		}),

	deleteEntry: (id: number) =>
		apiRequest<{ deleted: boolean }>('bromate_delete_ip_entry', {
			id,
		}),

	deleteEntries: (ids: number[]) =>
		apiRequest<{ deleted: number }>('bromate_delete_ip_entries', {
			ids: JSON.stringify(ids),
		}),

	getCountryStats: (list_type: ListType) =>
		apiRequest<{
			countries: Record<string, string>;
			stats: any;
			blocked_countries: string[];
		}>('bromate_get_country_stats', {
			list_type,
		}),
};