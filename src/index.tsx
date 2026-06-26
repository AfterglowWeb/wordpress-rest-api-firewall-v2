import { createShadowRootMount } from './shadowMount';
import { type AdminData } from '@app-types/admin';

document.addEventListener('DOMContentLoaded', function () {
  const raw = window.bromateRestApiFirewall;
  if (!raw) {
	return;
  }

  const adminData: AdminData = {
    ...raw,
    plugin_name: raw.plugin?.name ?? raw.plugin_name,
    plugin_version: raw.plugin?.version ?? raw.plugin_version,
  };

  createShadowRootMount(adminData);
});