import { useState, useEffect } from '@wordpress/element';
import { useLicense } from '../../../contexts/LicenseContext';
import { useAdminData } from '../../../contexts/AdminDataContext';
import { useApplication } from '../../../contexts/ApplicationContext';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import OutlinedInput from '@mui/material/OutlinedInput';

const getDisableBehaviors = ( __ ) => [
	{ value: '404',      label: __( '404 Not Found',                   'bromate-rest-api-firewall' ), desc: __( 'Returns a standard not-found response. The route appears to never have existed.',                       'bromate-rest-api-firewall' ) },
	{ value: '410',      label: __( '410 Gone',                        'bromate-rest-api-firewall' ), desc: __( 'Signals the resource was intentionally and permanently removed.',                                        'bromate-rest-api-firewall' ) },
	{ value: '301_url',  label: __( '301 Custom URL Redirect',         'bromate-rest-api-firewall' ), desc: __( 'Permanently redirects to a custom URL.',                                                                 'bromate-rest-api-firewall' ) },
	{ value: '301_page', label: __( '301 WordPress Page Redirect',     'bromate-rest-api-firewall' ), desc: __( 'Permanently redirects to a WordPress page.',                                                             'bromate-rest-api-firewall' ) },
	{ value: 'empty',    label: __( 'Empty (no response)',             'bromate-rest-api-firewall' ), desc: __( 'Closes the connection without a response body. The server appears to not exist on this route.',         'bromate-rest-api-firewall' ) },
];

/**
 * "Disabled Route Response" section.
 *
 * @param {Object}   props
 * @param {Object}   props.proSettings    - { disable_behavior, disable_redirect_url, disable_redirect_page_id }
 * @param {Function} props.onChange       - onChange handler for proSettings fields (receives a synthetic-like event with { target: { name, value } })
 * @param {Function} props.onSave         - save routine provided by the parent panel
 * @param {boolean}  props.canSave        - whether the Save button should be enabled
 * @param {boolean}  props.isModuleEnabled
 */
export default function DisabledRouteResponse( { proSettings, onChange, onSave, canSave, isModuleEnabled } ) {
	const { hasValidLicense, proNonce } = useLicense();
	const { adminData } = useAdminData();
	const { selectedApplicationId } = useApplication();
	const nonce = proNonce || adminData?.nonce;
	const { __ } = wp.i18n || {};

	const [ wpPages, setWpPages ] = useState( { special_pages: [], wordpress_pages: [] } );

	const behavior = proSettings.disable_behavior || '404';
	const DISABLE_BEHAVIORS = getDisableBehaviors( __ );

	useEffect( () => {
		if ( behavior !== '301_page' ) return;
		fetch( adminData.ajaxurl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
			body: new URLSearchParams( {
				action: 'get_wordpress_pages',
				nonce,
				id: selectedApplicationId,
			} ),
		} )
			.then( ( r ) => r.json() )
			.then( ( result ) => setWpPages( result?.data?.pages || { special_pages: [], wordpress_pages: [] } ) )
			.catch( () => {} );
	}, [ behavior, adminData, nonce, selectedApplicationId ] );

	return (
		<Tooltip
			title={ ! hasValidLicense ? __( 'License required', 'bromate-rest-api-firewall' ) : '' }
			followCursor
		>
			<Stack spacing={ 2 }>
				<Stack spacing={ 0 }>
					<Typography variant="subtitle1" fontWeight={ 600 }>
						{ __( 'Disabled Route Response', 'bromate-rest-api-firewall' ) }
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{ __( 'Defines how the server responds when a route is disabled.', 'bromate-rest-api-firewall' ) }
					</Typography>
				</Stack>

				<FormControl size="small" disabled={ ! isModuleEnabled || ! hasValidLicense } sx={ { maxWidth: 320 } }>
					<InputLabel>{ __( 'Response Type', 'bromate-rest-api-firewall' ) }</InputLabel>
					<Select
						value={ hasValidLicense ? behavior : '404' }
						name="disable_behavior"
						label={ __( 'Response Type', 'bromate-rest-api-firewall' ) }
						onChange={ onChange }
					>
						{ hasValidLicense
							? DISABLE_BEHAVIORS.map( ( b ) => (
								<MenuItem key={ b.value } value={ b.value }>{ b.label }</MenuItem>
							) )
							: <MenuItem value="404">{ __( '404 Not Found', 'bromate-rest-api-firewall' ) }</MenuItem>
						}
					</Select>
				</FormControl>

				{ hasValidLicense && (
					<Typography variant="caption" color="text.secondary">
						{ DISABLE_BEHAVIORS.find( ( b ) => b.value === behavior )?.desc }
					</Typography>
				) }

				{ hasValidLicense && behavior === '301_url' && (
					<TextField
						size="small"
						label={ __( 'Redirect URL', 'bromate-rest-api-firewall' ) }
						name="disable_redirect_url"
						value={ proSettings.disable_redirect_url || '' }
						onChange={ onChange }
						disabled={ ! isModuleEnabled }
						placeholder="https://example.com/not-found"
						sx={ { maxWidth: 400 } }
					/>
				) }

				{ hasValidLicense && behavior === '301_page' && (
					<FormControl size="small" disabled={ ! isModuleEnabled } sx={ { maxWidth: 320 } }>
						<InputLabel id="disable-redirect-page-label">{ __( 'WordPress Page', 'bromate-rest-api-firewall' ) }</InputLabel>
						<Select
							labelId="disable-redirect-page-label"
							value={ proSettings.disable_redirect_page_id || '' }
							name="disable_redirect_page_id"
							onChange={ onChange }
							input={ <OutlinedInput label={ __( 'WordPress Page', 'bromate-rest-api-firewall' ) } /> }
							renderValue={ ( val ) => {
								const all = [ ...( wpPages.special_pages || [] ), ...( wpPages.wordpress_pages || [] ) ];
								return all.find( ( p ) => String( p.value ) === String( val ) )?.label ?? val;
							} }
							MenuProps={ { PaperProps: { style: { maxHeight: 48 * 8 + 8, maxWidth: 320 } } } }
						>
							{ ( wpPages.special_pages || [] ).length > 0 && (
								<ListSubheader sx={ { fontWeight: 700, fontSize: '0.75rem', lineHeight: '28px', textTransform: 'uppercase', letterSpacing: 0.5 } }>
									{ __( 'Special Pages', 'bromate-rest-api-firewall' ) }
								</ListSubheader>
							) }
							{ ( wpPages.special_pages || [] ).map( ( page ) => (
								<MenuItem key={ page.value } value={ page.value } sx={ { pl: 3 } }>
									<ListItemText
										primary={ page.label }
										sx={ { '.MuiListItemText-primary': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } } }
									/>
								</MenuItem>
							) ) }
							{ ( wpPages.wordpress_pages || [] ).length > 0 && (
								<ListSubheader sx={ { fontWeight: 700, fontSize: '0.75rem', lineHeight: '28px', textTransform: 'uppercase', letterSpacing: 0.5 } }>
									{ __( 'Pages', 'bromate-rest-api-firewall' ) }
								</ListSubheader>
							) }
							{ ( wpPages.wordpress_pages || [] ).map( ( page ) => (
								<MenuItem key={ page.value } value={ page.value } sx={ { pl: 3 } }>
									<ListItemText
										primary={ page.label }
										sx={ { '.MuiListItemText-primary': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } } }
									/>
								</MenuItem>
							) ) }
						</Select>
					</FormControl>
				) }

			</Stack>
		</Tooltip>
	);
}
