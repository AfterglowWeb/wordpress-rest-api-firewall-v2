import {
	useState,
	useCallback,
	useReducer,
	useEffect,
	useRef,
} from '@wordpress/element';
import { useAdminData } from '../../../contexts/AdminDataContext';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';

import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsBackupRestoreOutlinedIcon from '@mui/icons-material/SettingsBackupRestoreOutlined';

import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

import { treeReducer } from './routesPolicyReducer';
import {
	findNodeById,
	normalizeTree,
	getAllDescendantMethodIds,
	countAllCustomNodes,
} from './routesPolicyUtils';
import { CustomTreeItem } from './RoutesPolicyNodeContent';
import TestPolicyPanel from './TestPolicyPanel';

function collectAncestorIds( nodes, targetPath ) {
	for ( const node of nodes ) {
		if ( node.path === targetPath ) return [ node.id ];
		if ( node.children?.length ) {
			const sub = collectAncestorIds( node.children, targetPath );
			if ( sub ) return [ node.id, ...sub ];
		}
	}
	return null;
}

export default function RoutesPolicyTree( { form, setField, selectedApplicationId, onNavigate, focusRoute } ) {
	
	const { adminData } = useAdminData();
	const nonce = adminData.nonce;
	const { __, sprintf } = wp.i18n || {};
	const [ treeData, setTreeData ] = useState( null );
	const [ loading, setLoading ] = useState( false );
	const [ errorMessage, setErrorMessage ] = useState( '' );
	const [ expandedItems, setExpandedItems ] = useState( [] );


	const loadRoutes = useCallback( async () => {
		setLoading( true );
		usersLoadedRef.current = false;
		try {
			const response = await fetch( adminData.ajaxurl, {
				method: 'POST',
				headers: {
					'Content-Type':
						'application/x-www-form-urlencoded; charset=UTF-8',
				},
				body: new URLSearchParams( {
					action: 'get_routes_policy_tree',
					nonce,
				} ),
			} );

			const result = await response.json();

			if ( result?.success ) {
				setTreeData( result.data.tree );
			}
		} catch ( error ) {
			setErrorMessage(
				'Error loading routes:' + JSON.stringify( error )
			);
		} finally {
			setLoading( false );
		}
	}, [ adminData, nonce ] );

	useEffect( () => {
		loadRoutes();
	}, [ loadRoutes ] );

	const [ nodes, dispatch ] = useReducer(
		treeReducer,
		treeData || [],
		normalizeTree
	);



	const handleToggle = ( id, key, effectiveValues ) =>
		dispatch( { type: 'TOGGLE_NODE', id, key, effectiveValues } );

	const getNodeById = ( id ) => findNodeById( nodes, id );


	const saveTree = useCallback(
		async ( tree, users ) => {
			setSaving( true );
			try {
				await fetch( adminData.ajaxurl, {
					method: 'POST',
					headers: {
						'Content-Type':
							'application/x-www-form-urlencoded; charset=UTF-8',
					},
					body: new URLSearchParams( {
						action: 'save_routes_policy_tree',
						nonce,
						tree: JSON.stringify( tree ),
					} ),
				} );
				setIsDirty( false );
			} catch {
				// Silent fail.
			} finally {
				setSaving( false );
			}
		},
		[ adminData, nonce ]
	);


	if ( loading || ( ! loading && ! treeData ) ) {
		return (
			<Box
				sx={ {
					minHeight: 352,
					minWidth: 250,
					display: 'flex',
					flexDirection: 'column',
					gap: 2,
					alignItems: 'center',
					justifyContent: 'center',
				} }
			>
				<Typography variant="body2" color="text.secondary">
					{ loading
						? __( 'Loading routes…', 'bromate-rest-api-firewall' )
						: __( 'No routes found', 'bromate-rest-api-firewall' ) }
				</Typography>
				{ loading && (
					<LinearProgress
						sx={ { width: '100%', maxWidth: 250 } }
						color="info"
					/>
				) }
			</Box>
		);
	}

	return (
		<Box sx={ { minHeight: 352, minWidth: '100%' } }>
			<Box sx={ { display: testRoute ? 'block' : 'none' } }>
				<TestPolicyPanel
					route={ testRoute?.route || '' }
					method={ testRoute?.method || 'GET' }
					hasUsers={ testRoute?.hasUsers || false }
					onClose={ () => setTestRoute( null ) }
					onNavigate={ onNavigate }
				/>
			</Box>

			<Box sx={ { display: testRoute ? 'none' : 'block' } }>

				<Toolbar disableGutters sx={ { gap: 1.5, mb: 2, flexWrap: 'wrap', minHeight: '0 !important' } }>
					<Button
						startIcon={ <RefreshIcon /> }
						size="small"
						onClick={ loadRoutes }
						disabled={ loading }
					>
						{ __( 'Refresh From Server', 'bromate-rest-api-firewall' ) }
					</Button>

					<Stack flex={ 1 } />


					<Stack direction="row" alignItems="center" gap={ 1 }>
						{ customCount > 0 && (
							<Chip
								label={ sprintf( __( '%d per-route settings', 'bromate-rest-api-firewall' ), customCount ) }
								size="small"
								variant="outlined"
							/>
						) }

						<Button
							startIcon={ <SettingsBackupRestoreOutlinedIcon /> }
							size="small"
							disabled={ customCount === 0 }
							onClick={ () => dispatch( { type: 'RESET_ALL_OVERRIDES' } ) }
						>
							{ __( 'Reset Per-route Settings', 'bromate-rest-api-firewall' ) }
						</Button>

						<Button
							variant="contained"
							size="small"
							disableElevation
							disabled={ ! isDirty || saving }
							onClick={ () => setConfirmSaveOpen( true ) }
						>
							{ saving
								? __( 'Saving…', 'bromate-rest-api-firewall' )
								: __( 'Save', 'bromate-rest-api-firewall' ) }
						</Button>
					</Stack>
				</Toolbar>

				<RichTreeView
					items={ nodes }
					slots={ { item: CustomTreeItem } }
					slotProps={ {
						item: {
							toggleNodeSetting: handleToggle,
							overrideNodeSetting: handleOverrideNode,
							getNodeById,
							openSettingsDrawer: hasValidLicense
								? handleOpenDrawer
								: null,
							toggleNodeCustom: handleToggleCustom,
							enforce_auth,

							hide_user_routes,
							hide_batch_routes,
							hide_oembed_routes,
							disabled_methods: disabled_methods || [],
							disabled_post_type_routes: disabledPostTypeRoutes,
							expandedItems,
							hasValidLicense,
							usersData,
							onNavigate,
							onTest: setTestRoute,
						},
					} }
					expandedItems={ expandedItems }
					onExpandedItemsChange={ ( _e, ids ) => setExpandedItems( ids ) }
				/>


			</Box>
		</Box>
	);
}
