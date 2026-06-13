import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import ObjectTypeSelect from '@components/ObjectTypeSelect';
import DisabledRouteResponse from '@features/routes/DisabledRouteResponse';

//import HTTP_METHODS from '@constants/http-methods';
const HTTP_METHODS = [ 'GET', 'POST', 'PUT', 'DELETE', 'PATCH' ];

export default function GlobalRoutesPolicy( { settings, onChange } ) {
	const { __ } = wp.i18n || {};

	return (
		<Stack spacing={ 2 } maxWidth={ 640 }>

			
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
						control={
							<Switch
								checked={ !! settings.routes_policy_hidden_routes }
								name="hide_user_routes"
								size="small"
								onChange={ setField }
							/>
						}
						label={ __( 'Disable /wp/v2/users/* Routes', 'bromate-rest-api-firewall' ) }
					/>
				</FormControl>

	
					<Stack spacing={ 2 }>
						<FormControl>
							<FormControlLabel
								control={
									<Switch
										checked={ !! settings.routes_policy_hidden_routes }
										name="hide_oembed_routes"
										size="small"
										onChange={ setField }
									/>
								}
								label={ __( 'Disable oembed/1.0/* Routes', 'bromate-rest-api-firewall' ) }
							/>
						</FormControl>

						<FormControl>
							<FormControlLabel
								control={
									<Switch
										checked={ !! settings.routes_policy_hidden_routes }
										name="hide_batch_routes"
										size="small"
										onChange={ setField }
									/>
								}
								label={ __( 'Disable batch/v1 Routes', 'bromate-rest-api-firewall' ) }
							/>
						</FormControl>
					</Stack>
			


			</Stack>

			<Divider />

			<DisabledRouteResponse
				onSave={ onSave }
			/>

			<Divider />

			<Stack spacing={ 2 }>
				
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
									control={
										<Switch
											size="small"
											checked={ (
											setting.routes_policy_hidden_methods || []
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
			
			</Stack>

			<Divider />

			<Stack spacing={ 2 }>
			
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
								name="disabled_post_types"
								label={ __(
									'Disable Object Types',
									'bromate-rest-api-firewall'
								) }
								value={ settings.routes_policy_hidden_post_types || [] }
								onChange={ setField }
							/>
						</Stack>
					</Stack>
			
			</Stack>


		</Stack>
	);
}
