// components/Models/GlobalProperties.tsx

import { __ } from '@wordpress/i18n';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';

import type { ModelsSettings } from '@app-types/models';

interface GlobalPropertiesProps {
  settings: ModelsSettings;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
}

interface ItemProps {
  name: keyof ModelsSettings;
  label: string;
  tip?: string;
  disabled?: boolean;
  indent?: boolean;
  pro?: boolean;
}

export default function GlobalModelsProperties({ 
  settings, 
  onFieldChange, 
  loading = false 
}: GlobalPropertiesProps) {

  const Item = ({ 
    name, 
    label, 
    tip, 
    disabled = false, 
    indent = false, 
    pro = false 
  }: ItemProps) => {
    const isDisabled = disabled === true || loading;
    const checkedValue = !!settings[name];

    return (
      <Tooltip title={tip || ''} disableInteractive followCursor>
        <FormControlLabel
          disabled={isDisabled}
          control={
            <Switch
              size="small"
              checked={checkedValue}
              name={name}
              onChange={onFieldChange}
            />
          }
          label={label}
          sx={{
            width: '50%',
            minWidth: 360,
            ...(indent && { pl: 2 }),
          }}
        />
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <Stack spacing={2} maxWidth={640}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="text" width="40%" height={40} />
        <Skeleton variant="rectangular" height={150} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2} maxWidth={640}>
      {/* Post Types and Taxonomies */}
      <Stack spacing={2}>
        <Stack spacing={0}>
          <Typography variant="subtitle1" fontWeight={600}>
            {__('Post Types and Taxonomies', 'rest-api-firewall')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {__('Output transformations applied to all post type and taxonomy responses.', 'rest-api-firewall')}
            <br />
            {__('Can be overridden per model.', 'rest-api-firewall')}
          </Typography>
        </Stack>
        <FormGroup sx={{ flexDirection: 'column', gap: 2 }}>
          <Item
            name="rest_models_relative_url_enabled"
            label={__('Relative URLs', 'rest-api-firewall')}
            tip={__('Remove the host from post and term URLs. Require License', 'rest-api-firewall')}
            pro
          />
          <Item
            disabled={!settings.rest_models_relative_url_enabled}
            indent
            name="rest_models_relative_attachment_url_enabled"
            label={__('Relative Attachment URLs', 'rest-api-firewall')}
            tip={__('Remove the host and upload path from attachment URLs. Require License', 'rest-api-firewall')}
            pro
          />
          <Item
            name="rest_models_remove_links_prop"
            label={__('Remove `_links`', 'rest-api-firewall')}
            tip={__('Remove the `_links` property from REST responses. Require License', 'rest-api-firewall')}
            pro
          />
          <Item
            name="rest_models_remove_embed_prop"
            label={__('Remove `_embed`', 'rest-api-firewall')}
            tip={__('Remove the `_embed` property from REST responses. Require License', 'rest-api-firewall')}
            pro
          />
          <Item
            name="rest_models_remove_empty_props"
            label={__('Remove Empty Properties', 'rest-api-firewall')}
            tip={__('Remove properties with empty values from REST responses. Require License', 'rest-api-firewall')}
            pro
          />
          <Item
            disabled={!settings.rest_models_remove_empty_props}
            name="rest_models_remove_empty_props_recursively"
            label={__('Apply to Nested Properties', 'rest-api-firewall')}
            tip={__('Also remove empty properties from nested objects. Require License', 'rest-api-firewall')}
            indent
            pro
          />
        </FormGroup>
      </Stack>

      <Divider />

      {/* Post Types Only */}
      <Stack spacing={2}>
        <Stack spacing={0}>
          <Typography variant="subtitle1" fontWeight={600}>
            {__('Post Types Only', 'rest-api-firewall')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {__('Additional transformations applied to post type responses only.', 'rest-api-firewall')}
            <br />
            {__('Can be overridden per model.', 'rest-api-firewall')}
          </Typography>
        </Stack>
        <FormGroup sx={{ flexDirection: 'column', gap: 2 }}>
          <Item
            name="rest_models_resolve_rendered_props"
            label={__('Flatten `rendered`', 'rest-api-firewall')}
            tip={__('Move the `rendered` value up to its parent.', 'rest-api-firewall')}
          />
          <Item
            name="rest_models_embed_featured_attachment_enabled"
            label={__('Resolve Featured Attachments', 'rest-api-firewall')}
            tip={__('Replace the featured attachment ID with its configured properties.', 'rest-api-firewall')}
          />
          <Item
            name="rest_models_embed_post_attachments_enabled"
            label={__('Resolve Attachments', 'rest-api-firewall')}
            tip={__('Collect featured, content, and ACF image/gallery attachments into a single `attachments` property.', 'rest-api-firewall')}
          />
          <Item
            name="rest_models_embed_terms_enabled"
            label={__('Resolve Terms', 'rest-api-firewall')}
            tip={__('Replace term IDs with their configured properties.', 'rest-api-firewall')}
          />
          <Item
            name="rest_models_embed_author_enabled"
            label={__('Resolve Authors', 'rest-api-firewall')}
            tip={__('Replace the author ID with its configured properties.', 'rest-api-firewall')}
          />
        </FormGroup>
      </Stack>

      <Divider />

      {/* Date Format */}
      <Stack spacing={2}>
        <Stack spacing={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {__('Date Format', 'rest-api-firewall')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {__('Format date properties. Can be overridden per model.', 'rest-api-firewall')}
            <br />
            {__('Default REST API format is ISO 8601 — e.g. 2024-01-15T14:30:00', 'rest-api-firewall')}
          </Typography>
        </Stack>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={!!settings.rest_models_date_format_enabled}
                name="rest_models_date_format_enabled"
                onChange={onFieldChange}
              />
            }
            label={__('Format Dates', 'rest-api-firewall')}
            sx={{ mr: 0 }}
          />
          <RadioGroup
            row
            name="rest_models_date_format"
            value={settings.rest_models_date_format || 'wordpress'}
            onChange={onFieldChange}
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}
          >
            <Tooltip 
              title={__('Uses the date and time format from WordPress General Settings', 'rest-api-firewall')} 
              placement="top"
            >
              <FormControlLabel
                value="wordpress"
                disabled={!settings.rest_models_date_format_enabled }
                control={<Radio size="small" />}
                label={__('WordPress', 'rest-api-firewall')}
              />
            </Tooltip>
            <FormControlLabel
              value="custom"
              disabled={!settings.rest_models_date_format_enabled }
              control={<Radio size="small" />}
              label={__('Custom', 'rest-api-firewall')}
            />
          </RadioGroup>
          <TextField
            size="small"
            placeholder="Y-m-d H:i:s"
            name="rest_models_date_format_custom"
            value={settings.rest_models_date_format_custom || ''}
            onChange={onFieldChange}
            disabled={
              !settings.rest_models_date_format_enabled || 
              settings.rest_models_date_format !== 'custom'
            }
            slotProps={{ 
              input: { 
                inputProps:{
                  pattern: '[YymndjHhisaA _:\\-\\/]+' 
                }
              } 
            }}
            sx={{ width: 160 }}
          />
        </Box>
      </Stack>
    </Stack>
  );
}