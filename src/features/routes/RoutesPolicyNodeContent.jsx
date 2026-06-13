import { forwardRef } from '@wordpress/element';
import { useLicense } from '../../../contexts/LicenseContext';
import { useAdminData } from '../../../contexts/AdminDataContext';

import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import RuleIcon from '@mui/icons-material/Rule';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';

import SettingsBackupRestoreOutlinedIcon from '@mui/icons-material/SettingsBackupRestoreOutlined';


import { TreeItem, TreeItemContent, treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { useTreeItem } from '@mui/x-tree-view/useTreeItem';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import CopyButton from '../../shared/CopyButton';
import {
	isNodeCustom,
	countModifiedDescendants,
	getAllDescendantMethodIds,
	isPluginRoute,
} from './routesPolicyUtils';

const StyledTreeItem = styled( TreeItem )( ( { theme } ) => ( {
	[ `& .${ treeItemClasses.groupTransition }` ]: {
		marginLeft: theme.spacing( 2 ),
		paddingLeft: theme.spacing( 1 ),
		borderLeft: `2px solid ${ alpha( theme.palette.text.primary, 0.15 ) }`,
	},
} ) );

export const CustomTreeItem = forwardRef(
	function CustomTreeItem( props, ref ) {
		const node = props.getNodeById
			? props.getNodeById( props.itemId )
			: null;

		return (
			<StyledTreeItem
				{ ...props }
				ref={ ref }
				data-route-path={ node?.path || node?.route }
				slots={ { content: NodeContent } }
				slotProps={ {
					content: {
						toggleNodeSetting: props.toggleNodeSetting,
						overrideNodeSetting: props.overrideNodeSetting,
						getNodeById: props.getNodeById,
						openSettingsDrawer: props.openSettingsDrawer,
						toggleNodeCustom: props.toggleNodeCustom,
						node,
						enforce_auth: props.enforce_auth,
						hide_user_routes: props.hide_user_routes,
						hide_batch_routes: props.hide_batch_routes,
						hide_oembed_routes: props.hide_oembed_routes,
						disabled_methods: props.disabled_methods,
						disabled_post_type_routes:
							props.disabled_post_type_routes,
						expandedItems: props.expandedItems,
						usersData: props.usersData,
						onNavigate: props.onNavigate,
						onTest: props.onTest,
					},
				} }
			/>
		);
	}
);

export function NodeContent( {
	children,
	toggleNodeSetting,
	overrideNodeSetting,
	getNodeById,
	openSettingsDrawer,
	toggleNodeCustom,
	node,
	enforce_auth,
	hide_user_routes,
	hide_batch_routes,
	hide_oembed_routes,
	disabled_methods,
	disabled_post_type_routes,
	expandedItems,
	usersData,
	onNavigate,
	onTest,
	...props
} ) {
	useTreeItem( props );
	const { __, sprintf } = wp.i18n || {};
	const { hasValidLicense } = useLicense();
	const { adminData } = useAdminData();

	if ( ! node?.id ) {
		return <TreeItemContent { ...props }>{ children }</TreeItemContent>;
	}

	const nodeSettings = node.settings ?? {
		protect: { value: false, inherited: false, overridden: false },
		disabled: { value: false, inherited: false, overridden: false },
		rate_limit: { value: false, inherited: false, overridden: false },
		rate_limit_time: { value: false, inherited: false, overridden: false },
	};

	const postTypeForRoute = ! node.isMethod
		? ( adminData?.post_types || [] ).find( ( pt ) => {
				const prefix = `/wp/v2/${ pt.rest_base || pt.value }`;
				return (
					node.path === prefix ||
					node.path?.startsWith( prefix + '/' )
				);
		  } )
		: null;

	const postTypeForMethod = node.isMethod
		? ( adminData?.post_types || [] ).find( ( pt ) => {
				const prefix = `/wp/v2/${ pt.rest_base || pt.value }`;
				return (
					node.route === prefix ||
					node.route?.startsWith( prefix + '/' )
				);
		  } )
		: null;

	const isCustom = isNodeCustom( nodeSettings );
	const hasChildren = node.children && node.children.length > 0;
	const modifiedCount = countModifiedDescendants( node );

	const nodeIsPlugin = isPluginRoute( node );
	const authIsGlobal = !! enforce_auth && ! isCustom && ! nodeIsPlugin;
	const isAuthEnforced = authIsGlobal || nodeSettings.protect?.value;

	const isUserRoute = !! (
		node.path?.startsWith( '/wp/v2/users' ) ||
		node.route?.startsWith( '/wp/v2/users' )
	);

	const isBatchRoute = !! (
		node.path?.startsWith( '/wp/v2/batch' ) ||
		node.path?.startsWith( '/batch/v1' ) ||
		node.route?.startsWith( '/batch/v1' )
	);

	const isOembedRoute = !! (
		node.path?.startsWith( '/oembed' ) ||
		node.route?.startsWith( '/oembed' )
	);

	const isMethodGloballyDisabled =
		!! node.isMethod &&
		( disabled_methods || [] ).includes( node.method?.toLowerCase() );

	const isPostTypeGloballyDisabled = ( disabled_post_type_routes || [] ).some(
		( prefix ) =>
			node.path === prefix || node.path?.startsWith( prefix + '/' )
	);

	const disabledIsGlobal =
		! isCustom &&
		( ( !! hide_user_routes && isUserRoute ) ||
			( !! hide_batch_routes && isBatchRoute ) ||
			( !! hide_oembed_routes && isOembedRoute ) ||
			isMethodGloballyDisabled ||
			isPostTypeGloballyDisabled );

	const isDisabled = disabledIsGlobal || !! nodeSettings.disabled?.value;

	const effectiveValues = {
		protect: isAuthEnforced,
		disabled: isDisabled,
	};

	const ownUserCount = node.isMethod
		? ( usersData || [] ).filter( ( u ) =>
				u.related_routes_uuid.includes( node.id )
		  ).length
		: 0;

	const buttonUserCount = node.isMethod
		? ownUserCount
		: ( usersData || [] ).filter( ( u ) =>
				getAllDescendantMethodIds( node ).some( ( id ) =>
					u.related_routes_uuid.includes( id )
				)
		  ).length;

	const handleSwitchClick = ( e ) => e.stopPropagation();

	const handleAuthToggle = ( e ) => {
		e.stopPropagation();
		toggleNodeSetting( node.id, 'protect', effectiveValues );
	};

	const handleDisableToggle = ( e ) => {
		e.stopPropagation();
		toggleNodeSetting( node.id, 'disabled', effectiveValues );
	};

	const getPermissionColor = ( type ) => {
		switch ( type ) {
			case 'public':
				return 'error';
			case 'protected':
				return 'warning';
			case 'forbidden':
				return 'success';
			case 'authenticated':
				return 'success';
			case 'custom':
				return 'info';
			default:
				return 'default';
		}
	};

	const getEffectivePermission = ( type ) =>
		isDisabled ? 'forbidden' : isAuthEnforced ? 'authenticated' : type;

	const isInherited = ! isCustom;

	return (
		<TreeItemContent
			{ ...props }
			sx={ {
				...( props.sx || {} ),
			} }
		>
			<Stack
				direction="row"
				alignItems="center"
				gap={ 0.5 }
				flex={ 1 }
				py={ 1 }
			>
				<Stack direction="column" spacing={ 0.5 }>
					<Stack
						direction="row"
						spacing={ 1 }
						alignItems="center"
						sx={ {
							cursor:
								isDisabled && node.isMethod
									? 'default'
									: 'pointer',
						} }
					>

						<Stack
							direction="row"
							alignItems="center"
							sx={ { opacity: isDisabled ? 0.45 : 1 } }
						>
							{ children }
						</Stack>

						{ node.permission && (
							<Chip
								label={
									getEffectivePermission(
										node.permission.type
									) || __( 'unknown', 'bromate-rest-api-firewall' )
								}
								size="small"
								variant="outlined"
								color={ getPermissionColor(
									getEffectivePermission(
										node.permission.type
									)
								) }
							/>
						) }

						<Stack
							direction="row"
							alignItems="center"
							gap={ 0.5 }
						>
							{ modifiedCount > 0 && (
								<Box
									component="span"
									sx={ {
										bgcolor: 'info.main',
										color: '#fff',
										borderRadius: '50%',
										width: 18,
										height: 18,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: '0.65rem',
										fontWeight: 700,
										lineHeight: 1,
										flexShrink: 0,
									} }
								>
									{ modifiedCount }
								</Box>
							) }

							
						</Stack>

						{ node.isMethod && node.route && onTest && (
							<Button
								variant="text"
								size="small"
								onClick={ ( e ) => {
									e.stopPropagation();
									onTest( {
										route: node.route,
										method: node.method || 'GET',
										hasChildren,
										hasUsers: ownUserCount > 0,
									} );
								} }
								startIcon={ <PlayArrowIcon /> }
								sx={ { minWidth: 'auto', textTransform: 'none' } }
							>
								{ __( 'Test', 'bromate-rest-api-firewall' ) }
							</Button>
						) }
					</Stack>

					{ node.permission?.callback && (
						<Typography
							variant="caption"
							sx={ {
								color: 'text.secondary',
								fontSize: '0.7rem',
								ml: 4,
							} }
						>
							{ sprintf(
								__( 'Permission: %s', 'bromate-rest-api-firewall' ),
								node.permission.callback
							) }
						</Typography>
					) }
				</Stack>

				{ ! node.isMethod && ( node.path || node.route ) && (
					<Tooltip disableInteractive title={ __( 'Copy path', 'bromate-rest-api-firewall' ) }>
						<CopyButton toCopy={ node.path || node.route } />
					</Tooltip>
				) }

			{ ( postTypeForRoute || postTypeForMethod ) && onNavigate && (
				<>
					<Tooltip disableInteractive title={ __( 'View collection', 'bromate-rest-api-firewall' ) }>
						<IconButton
							size="small"
							onClick={ ( e ) => {
								e.stopPropagation();
								const pt = postTypeForRoute || postTypeForMethod;
								onNavigate( { panel: 'collections', subKey: pt.value } );
							} }
							sx={ { opacity: 0.5 } }
						>
							<ListAltOutlinedIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip disableInteractive title={ __( 'View model properties', 'bromate-rest-api-firewall' ) }>
						<IconButton
							size="small"
							onClick={ ( e ) => {
								e.stopPropagation();
								const pt = postTypeForRoute || postTypeForMethod;
								onNavigate( { panel: 'models-properties', subKey: pt.value } );
							} }
							sx={ { opacity: 0.5 } }
						>
							<RuleIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</>
			) }
			</Stack>

			<Stack
				direction="row"
				spacing={ 1 }
				alignItems="center"
				onClick={ handleSwitchClick }
			>
				{ isCustom ? (
					<Tooltip
						disableInteractive
						title={
							! hasValidLicense
								? __(
										'Pro version required',
										'bromate-rest-api-firewall'
								  )
								: __(
										'Remove route settings and inherit from parent',
										'bromate-rest-api-firewall'
								  )
						}
					>
						<span>
							<IconButton
								size="small"
								disabled={ ! hasValidLicense }
								onClick={ ( e ) => {
									e.stopPropagation();
									toggleNodeCustom(
										node.id,
										effectiveValues
									);
								} }
							>
								<SettingsBackupRestoreOutlinedIcon fontSize="small" />
							</IconButton>
						</span>
					</Tooltip>
				) : (
					<Tooltip
						disableInteractive
						title={
							! hasValidLicense
								? __(
										'Pro version required',
										'bromate-rest-api-firewall'
								  )
								: __(
										'Add settings on this route',
										'bromate-rest-api-firewall'
								  )
						}
					>
						<span>
							<IconButton
								size="small"
								disabled={ ! hasValidLicense }
								onClick={ ( e ) => {
									e.stopPropagation();
									toggleNodeCustom(
										node.id,
										effectiveValues
									);
								} }
								sx={ { opacity: hasValidLicense ? 0.35 : 0.2 } }
							>
								<SettingsOutlinedIcon fontSize="small" />
							</IconButton>
						</span>
					</Tooltip>
				) }

				<Tooltip
					disableInteractive
					title={
						! hasValidLicense
							? __( 'Pro version required', 'bromate-rest-api-firewall' )
							: __( 'Access settings (users, IPs, origins)', 'bromate-rest-api-firewall' )
					}
				>
					<span>
						<Button
							size="small"
							variant="text"
							disabled={ ! hasValidLicense || ! openSettingsDrawer }
							onClick={ ( e ) => {
								e.stopPropagation();
								openSettingsDrawer( node.id );
							} }
							startIcon={ <ManageAccountsOutlinedIcon fontSize="small" /> }
							sx={ { textTransform: 'none', minWidth: 'auto' } }
						>
							{ buttonUserCount > 0
								? `${ buttonUserCount } user${
										buttonUserCount > 1 ? 's' : ''
									}`
								: __( 'Access', 'bromate-rest-api-firewall' ) }
						</Button>
					</span>
				</Tooltip>

				<Tooltip
					disableInteractive
					title={
						! hasValidLicense
							? __( 'Pro version required', 'bromate-rest-api-firewall' )
							: isDisabled && node.isMethod
							? __( 'Route is disabled', 'bromate-rest-api-firewall' )
							: authIsGlobal
							? __(
									'Authentication enforced globally — click to override for this route',
									'bromate-rest-api-firewall'
							  )
							: isAuthEnforced
							? __(
									'Authentication enforced',
									'bromate-rest-api-firewall'
							  )
							: __(
									'Enable authentication for this route',
									'bromate-rest-api-firewall'
							  )
					}
				>
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={ isAuthEnforced }
								onChange={ handleAuthToggle }
								disabled={
									! hasValidLicense ||
									( isDisabled && node.isMethod )
								}
								sx={ {
									opacity:
										( isDisabled && node.isMethod ) ||
										authIsGlobal ||
										isInherited ||
										! hasValidLicense
											? 0.6
											: 1,
								} }
							/>
						}
						label={
							<Typography
								variant="body2"
								sx={ { fontSize: '0.875rem' } }
							>
								{ __( 'Auth', 'bromate-rest-api-firewall' ) }
							</Typography>
						}
					/>
				</Tooltip>

				<Tooltip
					disableInteractive
					title={
						! hasValidLicense
							? __( 'Pro version required', 'bromate-rest-api-firewall' )
							: disabledIsGlobal
							? hide_user_routes && isUserRoute
								? __(
										'Users routes disabled globally — pin custom settings to override',
										'bromate-rest-api-firewall'
								  )							: hide_batch_routes && isBatchRoute
							? __(
									'Batch routes disabled globally — pin custom settings to override',
									'bromate-rest-api-firewall'
							  )
							: hide_oembed_routes && isOembedRoute
							? __(
									'oEmbed routes disabled globally — pin custom settings to override',
									'bromate-rest-api-firewall'
							  )								: isPostTypeGloballyDisabled
								? __(
										'Post type disabled globally — pin custom settings to override',
										'bromate-rest-api-firewall'
								  )
								: __(
										'Method disabled globally — pin custom settings to override',
										'bromate-rest-api-firewall'
								  )
							: isDisabled
							? __(
									'This route is disabled',
									'bromate-rest-api-firewall'
							  )
							: __( 'Disable this route', 'bromate-rest-api-firewall' )
					}
				>
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={ isDisabled }
								onChange={ handleDisableToggle }
								disabled={ ! hasValidLicense }
								sx={ {
									opacity:
										isInherited ||
										disabledIsGlobal ||
										! hasValidLicense
											? 0.6
											: 1,
								} }
							/>
						}
						label={
							<Typography
								variant="body2"
								sx={ { fontSize: '0.875rem' } }
							>
								{ __( 'Disable', 'bromate-rest-api-firewall' ) }
							</Typography>
						}
					/>
				</Tooltip>
			</Stack>
		</TreeItemContent>
	);
}
