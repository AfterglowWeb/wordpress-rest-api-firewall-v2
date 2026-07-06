import { useCallback } from '@wordpress/element';
import { useAdminData } from '@totp-contexts/AdminDataContext';
import TOTPEnrollment from './TOTPEnrollment';

export default function App() {
  const { adminData, updateAdminData } = useAdminData();

  const handleSetupComplete = useCallback(() => {
    updateAdminData({ show_dialog: false, is_user_enabled: true });
  }, [updateAdminData]);

  const handleClose = useCallback(() => {
    updateAdminData({ show_dialog: false });
  }, [updateAdminData]);

  if (adminData.is_profile_page) {
    return (
      <TOTPEnrollment
        mode="inline"
        username={adminData.username || ''}
        issuer={adminData.plugin_name || 'Bromate REST API'}
        onSetupComplete={handleSetupComplete}
        onClose={handleClose}
      />
    );
  }

  if (!adminData.show_dialog) {
    return null;
  }

  return (
    <TOTPEnrollment
      mode={adminData.is_user_enabled ? 'verify' : 'dialog'}
      open={adminData.show_dialog}
      username={adminData.username || ''}
      issuer={adminData.plugin_name || 'Bromate REST API'}
      onSetupComplete={handleSetupComplete}
      onClose={handleClose}
    />
  );
}