import { apiRequest } from '@services/api';

export type ListType = 'blacklist' | 'whitelist';
export type EntyType = 'manual' | 'rate_limit';
export interface IpEntry {
  id: number;
  ip: string;
  list_type: ListType; 
  entry_type: EntyType;
  agent?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  user_id?: number | null;
  blocked_at?: string;
  created_at: string;
}

export const IpAPI = {
  getEntries: (list_type: ListType) =>
    apiRequest<{ entries: IpEntry[] }>('bromate_get_ip_entries', { list_type }),

  addEntry: (ip: string, list_type: ListType, user_id?: number | null) =>
    apiRequest<{ entry: IpEntry }>('bromate_add_ip_entry', {
      ip,
      list_type,
      ...(user_id ? { user_id } : {}),
    }),

  deleteEntry: (id: number) =>
    apiRequest<{ deleted: boolean }>('bromate_delete_ip_entry', { id }),

  deleteEntries: (ids: number[]) =>
    apiRequest<{ deleted: number }>('bromate_delete_ip_entries', {
      ids: JSON.stringify(ids),
    }),

  getUserEntries: (user_id: number) =>
    apiRequest<{ entries: IpEntry[] }>('bromate_get_user_ip_entries', { user_id }),

  getCountryStats: (list_type: ListType) =>
    apiRequest<{
      countries: Record<string, string>;
      stats: any;
      blocked_countries: string[];
    }>('bromate_get_country_stats', { list_type }),
};