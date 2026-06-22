import { AdminData } from './admin';

export {};

declare global {
	interface Window {
		bromateRestApiFirewall: AdminData;
	}
}