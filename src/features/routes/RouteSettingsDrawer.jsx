import { useState, useCallback } from '@wordpress/element';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import CloseIcon from '@mui/icons-material/Close';

import AllowedIps from '../../IpFilter/AllowedIps';
import AllowedOrigins from '../../IpFilter/AllowedOrigins';
import { isPluginRoute } from './routesPolicyUtils';

const PLUGIN_ROUTE_WARNING_KEY = 'raf_plugin_route_warning_dismissed';

/**
 * Route Settings Drawer — opens from the right when the admin clicks the
 * "Access settings" button on any route row.
 *
 * Sections:
 *  1. Authenticated Users  (fully functional — mirrors RoutesPolicyUsersPopover)
 *  2. Allowed IPs          (UI only — persistence requires per-route backend storage)
 *  3. Allowed Origins      (UI only — persistence requires per-route backend storage)
 *
 * For plugin routes a cross-application warning banner is shown at the top,
 * and a one-time confirmation dialog fires on the first edit.
 */
export default function RouteSettingsDrawer( {
	open,
	node,
	usersData,
	usersLoading,
	isBulk,
	routeIds,
	onUserAccessChange,
	onClose,
} ) {
	const { __, sprintf } = wp.i18n || {};

	const isPlugin = node ? isPluginRoute( node ) : false;
	const [ warningOpen, setWarningOpen ] = useState( false );
	const [ warningDismissed, setWarningDismissed ] = useState(
		() => !! localStorage.getItem( PLUGIN_ROUTE_WARNING_KEY )
	);

	// Intercept first interaction with a plugin route node.
	const guardPluginEdit = useCallback(
		( callback ) => {
			if ( isPlugin && ! warningDismissed ) {
				setWarningOpen( true );
				// Stash callback to run after confirmation.
				setWarningCallback( () => callback );
			} else {
				callback();
			}
		},
		[ isPlugin, warningDismissed ]
	);

	const [ warningCallback, setWarningCallback ] = useState( null );

	const handleWarningConfirm = ( dontShowAgain ) => {
		if ( dontShowAgain ) {
			localStorage.setItem( PLUGIN_ROUTE_WARNING_KEY, '1' );
			setWarningDismissed( true );
		}
		setWarningOpen( false );
		if ( warningCallback ) {
			warningCallback();
			setWarningCallback( null );
		}
	};

	const handleUserChange = ( userId, ids, grant ) => {
		guardPluginEdit( () => onUserAccessChange( userId, ids, grant ) );
	};

	const nodePath = node?.path || node?.route || '';
	const isBulkNode = isBulk || false;

	return (
		<>
			<Drawer
				anchor="right"
				open={ open }
				onClose={ onClose }
				PaperProps={ { sx: { width: 360, display: 'flex', flexDirection: 'column' } } }
			>
				<Toolbar variant="dense" disableGutters sx={ { px: 2, borderBottom: 1, borderColor: 'divider' } }>
					<Typography variant="subtitle2" fontWeight={ 600 } flexGrow={ 1 } noWrap>
						{ isBulkNode
							? __( 'Access settings — all children', 'bromate-rest-api-firewall' )
							: sprintf(
									/* translators: %s: route path */
									__( 'Access settings — %s', 'bromate-rest-api-firewall' ),
									nodePath
							  ) }
					</Typography>
					<IconButton size="small" onClick={ onClose }>
						<CloseIcon fontSize="small" />
					</IconButton>
				</Toolbar>

				<Stack flexGrow={ 1 } overflow="auto" p={ 2 } spacing={ 3 }>

					{ isPlugin && (
						<Alert severity="warning" sx={ { fontSize: '0.8rem' } }>
							{ __( 'These settings apply to all applications on this installation. Plugin route policies are shared across every application.', 'bromate-rest-api-firewall' ) }
						</Alert>
					) }

					{ /* ── Section 1: Authenticated Users ── */ }
					<Stack spacing={ 1 }>
						<Typography variant="subtitle2" fontWeight={ 600 }>
							{ __( 'Authenticated Users', 'bromate-rest-api-firewall' ) }
						</Typography>

						{ usersLoading && (
							<Box display="flex" justifyContent="center" py={ 1 }>
								<CircularProgress size={ 20 } />
							</Box>
						) }

						{ ! usersLoading && usersData !== null && usersData.length === 0 && (
							<Typography variant="body2" color="text.secondary">
								{ __( 'No users configured for this application.', 'bromate-rest-api-firewall' ) }
							</Typography>
						) }

						{ ! usersLoading && usersData && usersData.length > 0 && (
							<Stack spacing={ 0 }>
								<Typography variant="caption" color="text.secondary" sx={ { mb: 0.5, fontSize: '0.7rem' } }>
									{ isBulkNode
										? __( 'Check to restrict user access to all children of this route.', 'bromate-rest-api-firewall' )
										: __( 'Check to restrict user access to this route only.', 'bromate-rest-api-firewall' ) }
								</Typography>

								{ usersData.map( ( user ) => {
									const matchCount = ( routeIds || [] ).filter(
										( id ) => user.related_routes_uuid.includes( id )
									).length;
									const total = ( routeIds || [] ).length;
									const isChecked = total > 0 && matchCount === total;
									const isIndeterminate = isBulkNode && matchCount > 0 && matchCount < total;

									return (
										<FormControlLabel
											key={ user.id }
											control={
												<Checkbox
													size="small"
													checked={ isChecked }
													indeterminate={ isIndeterminate }
													onChange={ ( e ) =>
														handleUserChange( user.id, routeIds, e.target.checked )
													}
													sx={ { py: 0.5 } }
												/>
											}
											label={ <Typography variant="body2">{ user.display_name }</Typography> }
										/>
									);
								} ) }
							</Stack>
						) }
					</Stack>

					<Divider />

					{ /* ── Section 2: Allowed IPs ── */ }
					<Stack spacing={ 1 }>
						<Typography variant="subtitle2" fontWeight={ 600 }>
							{ __( 'Allowed IPs', 'bromate-rest-api-firewall' ) }
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{ __( 'Restrict access to this route to specific IPs or CIDR ranges.', 'bromate-rest-api-firewall' ) }
						</Typography>
						{ /* Per-route IP persistence requires backend route-level storage (§7 ARCHITECTURE.md). */ }
						<AllowedIps
							inline
							value={ [] }
							onChange={ () => {} }
							onSave={ () => {} }
						/>
					</Stack>

					<Divider />

					{ /* ── Section 3: Allowed Origins ── */ }
					<Stack spacing={ 1 }>
						<Typography variant="subtitle2" fontWeight={ 600 }>
							{ __( 'Allowed Origins', 'bromate-rest-api-firewall' ) }
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{ __( 'Restrict access to this route to specific origins/domains.', 'bromate-rest-api-firewall' ) }
						</Typography>
						{ /* Per-route origin persistence requires backend route-level storage (§7 ARCHITECTURE.md). */ }
						<AllowedOrigins
							inline
							value={ [] }
							onChange={ () => {} }
							onSave={ () => {} }
						/>
					</Stack>

				</Stack>
			</Drawer>

			{ /* ── Plugin Route Warning Dialog ── */ }
			{ warningOpen && (
				<PluginRouteWarningDialog
					onConfirm={ handleWarningConfirm }
					onCancel={ () => {
						setWarningOpen( false );
						setWarningCallback( null );
					} }
				/>
			) }
		</>
	);
}

function PluginRouteWarningDialog( { onConfirm, onCancel } ) {
	const { __ } = wp.i18n || {};
	const [ dontShow, setDontShow ] = useState( false );

	return (
		<Dialog open onClose={ onCancel } maxWidth="xs" fullWidth>
			<DialogTitle>
				{ __( 'This change applies across all applications', 'bromate-rest-api-firewall' ) }
			</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					{ __( 'Plugin route settings are shared across all your applications. Changing users, IPs, or origins here affects every application on this installation.', 'bromate-rest-api-firewall' ) }
				</Typography>
				<FormControlLabel
					sx={ { mt: 2 } }
					control={
						<Checkbox
							size="small"
							checked={ dontShow }
							onChange={ ( e ) => setDontShow( e.target.checked ) }
						/>
					}
					label={
						<Typography variant="body2">
							{ __( "Don't show this message again", 'bromate-rest-api-firewall' ) }
						</Typography>
					}
				/>
			</DialogContent>
			<DialogActions>
				<Button size="small" onClick={ onCancel }>
					{ __( 'Cancel', 'bromate-rest-api-firewall' ) }
				</Button>
				<Button
					size="small"
					variant="contained"
					onClick={ () => onConfirm( dontShow ) }
				>
					{ __( 'I understand', 'bromate-rest-api-firewall' ) }
				</Button>
			</DialogActions>
		</Dialog>
	);
}
