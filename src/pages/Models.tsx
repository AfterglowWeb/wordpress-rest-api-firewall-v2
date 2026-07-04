import { useEffect, useRef } from '@wordpress/element';
import { useAdminData } from '@contexts/AdminDataContext';

export default function Models() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { adminData } = useAdminData();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !adminData.has_rest_api_models) return;

    const mount = () => {
      if (typeof window.bromateModelsApp === 'function' && container) {
        cleanupRef.current = window.bromateModelsApp(adminData, container);
      }
    };

    if (typeof window.bromateModelsApp === 'function') {
      mount();
    } else {
      window.addEventListener('bromate-models-app-ready', mount, { once: true });
    }

    return () => {
      window.removeEventListener('bromate-models-app-ready', mount);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [adminData]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
}