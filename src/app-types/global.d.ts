
export {};

declare global {
	interface Window {
		bromateRestApiFirewall: AdminData;
		bromateModelsApp?: (adminData: AdminData, container: HTMLElement) => () => void;

	}
}

