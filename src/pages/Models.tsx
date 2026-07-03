// components/Models/Models.tsx

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';

import { useModelsGlobalSettings } from '@hooks/useModelGlobalSettings';
import GlobalModelsProperties from '@features/models/GlobalModelsProperties';
import ModelsGrid from '@features/models/ModelsGrid';

export default function Models() {
  const { settings, updateSettings, applyToAll, loading } = useModelsGlobalSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    updateSettings({
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleApplyToAll = async () => {
    try {
      await applyToAll(settings);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Stack p={4} flexGrow={1} spacing={3}>
      {!isEditing && (
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<TuneOutlinedIcon />}
            iconPosition="start"
            label={__('Global Settings', 'rest-api-firewall')}
          />
          <Tab
            icon={<RuleOutlinedIcon />}
            iconPosition="start"
            label={__('Property Models', 'rest-api-firewall')}
          />
        </Tabs>
      )}

      {!isEditing && currentTab === 0 && (
        <Stack spacing={3} sx={{ maxWidth: 600 }}>
          <GlobalModelsProperties
            settings={settings}
            onFieldChange={handleFieldChange}
            loading={loading}
          />
          <Stack direction="row">
            <Button
              size="small"
              variant="contained"
              disableElevation
              disabled={loading}
              onClick={handleApplyToAll}
            >
              {__('Save Global Settings', 'rest-api-firewall')}
            </Button>
          </Stack>
        </Stack>
      )}

      {currentTab === 1 && (
        <ModelsGrid onEditingChange={setIsEditing} />
      )}
    </Stack>
  );
}