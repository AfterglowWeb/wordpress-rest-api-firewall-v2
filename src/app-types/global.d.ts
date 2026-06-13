import { AdminData } from './admin';

export {};

declare global {
	interface Window {
		restApiFirewallAdminData?: AdminData;
		restApiFirewallPro?: Record<string, unknown>;
	}
}