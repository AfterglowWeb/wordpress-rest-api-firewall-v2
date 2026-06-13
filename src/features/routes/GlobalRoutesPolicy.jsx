import { useLicense } from '../../../contexts/LicenseContext';

import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import ObjectTypeSelect from '../../shared/ObjectTypeSelect';
import DisabledRouteResponse from './DisabledRouteResponse';

const HTTP_METHODS = [ 'GET', 'POST', 'PUT', 'DELETE', 'PATCH' ];

export default function GlobalRoutesPolicy( { form, setField, proSettings, onProChange, onMethodToggle, onSave, canSave, isModuleEnabled } ) {
	const { hasValidLicense } = useLicense();
	const { __ } = wp.i18n || {};

	return (
		<Stack spacing={ 2 } maxWidth={ 640 }>

			<Stack spacing={ 2 }>

				<Stack spacing={ 0 }>
					<Typography variant="subtitle1" fontWeight={ 600 }>
						{ __( 'Auth. & Rate Limiting', 'bromate-rest-api-firewall' ) }
					</Typography>
				</Stack>

				<FormControl>
					<FormControlLabel
						disabled={ ! isModuleEnabled }
						control={
							<Switch
								checked={ hasValidLicense ? !! proSettings.enforce_auth : !! form.enforce_auth }
								name="enforce_auth"
								size="small"
								onChange={ hasValidLicense ? onProChange : setField }
							/>
						}
						label={ __( 'Enforce Authentication on All Routes', 'bromate-rest-api-firewall' ) }
					/>
					<FormHelperText>{ __( 'Applies to WordPress core routes only (wp, oembed, batch). Third-party plugin routes (e.g. WooCommerce) are not affected.', 'bromate-rest-api-firewall' ) }</FormHelperText>
				</FormControl>


			</Stack>
	
			<Divider />

			<Stack spacing={ 2 }>

				<Stack spacing={ 0 }>
					<Typography variant="subtitle1" fontWeight={ 600 }>
						{ __( 'Disable Routes', 'bromate-rest-api-firewall' ) }
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{ __( 'WordPress Core routes require specific handling to be properly disabled.', 'bromate-rest-api-firewall' ) }
					</Typography>
				</Stack>

				<FormControl>
					<FormControlLabel
						disabled={ ! isModuleEnabled }
						control={
							<Switch
								checked={ hasValidLicense ? !! proSettings.hide_user_routes : !! form.hide_user_routes }
								name="hide_user_routes"
								size="small"
								onChange={ hasValidLicense ? onProChange : setField }
							/>
						}
						label={ __( 'Disable /wp/v2/users/* Routes', 'bromate-rest-api-firewall' ) }
					/>
				</FormControl>

				<Tooltip
					title={ ! hasValidLicense ? __( 'License required', 'bromate-rest-api-firewall' ) : '' }
					followCursor
				>
					<Stack spacing={ 2 }>
						<FormControl>
							<FormControlLabel
								disabled={ ! hasValidLicense || ! isModuleEnabled }
								control={
									<Switch
										checked={ !! proSettings.hide_oembed_routes }
										name="hide_oembed_routes"
										size="small"
										onChange={ onProChange }
									/>
								}
								label={ __( 'Disable oembed/1.0/* Routes', 'bromate-rest-api-firewall' ) }
							/>
						</FormControl>

						<FormControl>
							<FormControlLabel
								disabled={ ! hasValidLicense || ! isModuleEnabled }
								control={
									<Switch
										checked={ proSettings.hide_batch_routes }
										name="hide_batch_routes"
										size="small"
										onChange={ onProChange }
									/>
								}
								label={ __( 'Disable batch/v1 Routes', 'bromate-rest-api-firewall' ) }
							/>
						</FormControl>
					</Stack>
				</Tooltip>


			</Stack>

			<Divider />

			<DisabledRouteResponse
				proSettings={ proSettings }
				onChange={ onProChange }
				onSave={ onSave }
				canSave={ canSave }
				isModuleEnabled={ isModuleEnabled }
			/>

			<Divider />

			<Stack spacing={ 2 }>
				<Tooltip
					title={
						! hasValidLicense
							? __( 'License required', 'bromate-rest-api-firewall' )
							: ''
					}
					followCursor
				>
					<Stack spacing={ 2 }>
						
						<Stack spacing={ 0 }>
							<Typography variant="subtitle1" fontWeight={ 600 }>
								{ __(
									'Disable HTTP Methods',
									'bromate-rest-api-firewall'
								) }
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{ __(
								'Blocks an HTTP method for all traffic to this application — anonymous and authenticated alike.',
									'bromate-rest-api-firewall'
								) }
	
							</Typography>
						</Stack>
						
						<Stack
							direction="row"
							gap={ 1 }
							flexWrap="wrap"
						>
							{ HTTP_METHODS.map( ( method ) => (
								<FormControlLabel
									key={ method }
									disabled={ ! hasValidLicense || ! isModuleEnabled }
									control={
										<Switch
											size="small"
											checked={ (
											proSettings.disabled_methods || []
											).includes( method.toLowerCase() ) }
											onChange={ onMethodToggle(
												method
											) }
										/>
									}
									label={ method.toUpperCase() }
									sx={ {
										m: 0,
										px: 1.5,
										py: 0.5,
										userSelect: 'none',
									} }
								/>
							) ) }
						</Stack>
					</Stack>
				</Tooltip>
			</Stack>

			<Divider />

			<Stack spacing={ 2 }>
				<Tooltip
					title={
						! hasValidLicense
							? __( 'License required', 'bromate-rest-api-firewall' )
							: ''
					}
					followCursor
				>
					<Stack spacing={ 2 }>
						<Stack spacing={ 0 }>
							<Typography variant="subtitle1" fontWeight={ 600 }>
								{ __(
									'Disable Post Types and Taxonomies',
									'bromate-rest-api-firewall'
								) }
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{ __(
								'Disables post types and taxonomies globally across all routes.',
									'bromate-rest-api-firewall'
								) }
	
							</Typography>
						</Stack>
						<Stack>
							<ObjectTypeSelect
								disabled={ ! hasValidLicense || ! isModuleEnabled }
								name="disabled_post_types"
								label={ __(
									'Disable Object Types',
									'bromate-rest-api-firewall'
								) }
								value={ proSettings.disabled_post_types || [] }
								onChange={ onProChange }
							/>
						</Stack>
					</Stack>
				</Tooltip>
			</Stack>

			<Stack direction="row">
				<Button
					variant="contained"
					disableElevation
					size="small"
					disabled={ ! canSave }
					onClick={ onSave }
				>
					{ __( 'Save Global Settings', 'bromate-rest-api-firewall' ) }
				</Button>
			</Stack>
		</Stack>
	);
}
