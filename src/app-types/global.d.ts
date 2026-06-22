import { AdminData } from './admin';

export {};

declare global {
	interface Window {
<<<<<<< HEAD
		restApiFirewallAdminData?: AdminData;
		restApiFirewallPro?: Record<string, unknown>;
=======
		bromateRestApiFirewall: AdminData;
>>>>>>> d78a3463b54610a29cf4b03016ae1c0da59bf6ae
	}
}