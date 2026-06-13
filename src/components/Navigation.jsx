import { useState, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useAdminData } from '@contexts/AdminDataContext';
import { useNavigation } from '@contexts/NavigationContext';

import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import AppBar from '@mui/material/AppBar';
import Badge from '@mui/material/Badge';
import Slide from '@mui/material/Slide';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SecurityOutlined from '@mui/icons-material/SecurityOutlined';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import ApiIcon from '@mui/icons-material/Api';
import WebhookIcon from '@mui/icons-material/Webhook';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import VpnLockOutlinedIcon from '@mui/icons-material/VpnLockOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import BusinessIcon from '@mui/icons-material/Business';

import AppIdentity from './AppIdentity';
import Documentation from './Documentation';

export const DRAWER_WIDTH = 220;
export const APP_BAR_HEIGHT = 75;
export const APP_FOOTER_HEIGHT = 40;
export const WP_ADMIN_BAR_HEIGHT_DESKTOP = 32;
export const WP_ADMIN_BAR_HEIGHT_MOBILE = 46;
export const WP_MENU_WIDTH_MD = 36;
export const WP_MENU_WIDTH_LG = 160;

export default function Navigation() {

	const activeMenuItem =
		menuItems.find( ( m ) => ! m.hidden && m.key === panel )
		|| menuItems.find( ( m ) => m.key === panel )
		|| null;

	return (
		<>
		<Drawer
			variant={ isMobile ? 'temporary' : 'permanent' }
			anchor="left"
			open={ isMobile ? mobileOpen : true }
			onClose={ () => setMobileOpen( false ) }
			sx={ {
				'.MuiPaper-root': {
					width: DRAWER_WIDTH,
					top: {
						xs: WP_ADMIN_BAR_HEIGHT_MOBILE,
						md: WP_ADMIN_BAR_HEIGHT_DESKTOP,
					},
					position: 'sticky',
					height: {
						xs: `calc(100vh - ${
							WP_ADMIN_BAR_HEIGHT_MOBILE
						}px)`,
						md: `calc(100vh - ${
							WP_ADMIN_BAR_HEIGHT_DESKTOP
						}px)`,
					},
					overflowY: 'auto',
				},
			} }
		>
			<AppIdentity />
			<Divider />

			<List component="nav" disablePadding sx={{pb:4}}>
				{ menuItems.map( ( item, index ) => {
					if ( item.hidden ) return null;
					if ( item.type === 'section' ) {
						return (
							<Stack
								sx={ { mt: 1 === index ? 0 : 2 } }
								key={ `section-${ index }` }
							>
								{ 0 !== index && <Divider /> }

								{ item.label ? (
									<Typography
										key={ `section-${ index }` }
										variant="caption"
										sx={ {
											display: 'block',
											px: 2,
											mb: 1,
											mt: 2,
											textTransform: 'uppercase',
											letterSpacing: 0.5,
											fontSize: '0.7rem',
											color: 'text.secondary',
										} }
									>
										{ item.label }
									</Typography>
								) : (
									<Stack py={ 1 } />
								) }
							</Stack>
						);
					}

					const Icon = item.icon;
				
					return (
						<ListItemButton
							selected={ panel === item.key }
							sx={ {
								pl: item.pl ? item.pl : 3,
								pr: 3
							} }
							disabled={ !! item.disabled }
							onClick={ () => {
								if ( item.action ) {
									item.action();
								} else {
									navigateGuarded( item.key );
								}
								setMobileOpen( false );
							} }
						>
							{ Icon && (
								<ListItemIcon
									sx={ {
										px: 1,
										minWidth: 32,
									} }
								>
				{ item.pendingBadge ? (
					<Badge
						badgeContent={ <PendingOutlinedIcon sx={ { fontSize: 10 } } /> }
						color="default"
						sx={ {
							'& .MuiBadge-badge': {
								backgroundColor: 'grey.400',
								color: 'white',
								padding: '2px',
							},
						} }
					>
						<Icon color={ panel === item.key ? 'primary' : ''} fontSize="small" />
					</Badge>
				) : (
					<Badge
						color="error"
						variant="dot"
						invisible={ ! item.badge }
					>
						<Icon color={ panel === item.key ? 'primary' : ''} fontSize="small" />
					</Badge>
				) }
								</ListItemIcon>
							) }
							<ListItemText
								sx={ {
									'& .MuiListItemText-primary': {
										lineHeight: 'normal',
										color: panel === item.key ? 'primary.main' : 'text.primary'
									},
								} }
								primary={ item.label }
								secondary={
									<Typography
										variant="caption"
										color="text.secondary"
									>
										{ item.secondary }
									</Typography>
								}
							/>
						</ListItemButton>
					);
				} ) }
			</List>
		</Drawer>
		<AppBar
			elevation={ 0 }
			sx={ {
				'&.MuiAppBar-root': {
					left: {
						md: WP_MENU_WIDTH_MD + DRAWER_WIDTH,
						lg: WP_MENU_WIDTH_LG + DRAWER_WIDTH,
					},
					top: {
						xs: WP_ADMIN_BAR_HEIGHT_MOBILE,
						md: WP_ADMIN_BAR_HEIGHT_DESKTOP,
					},
					width: {
						md: `calc(100% - ${DRAWER_WIDTH + WP_MENU_WIDTH_MD}px)`,
						lg: `calc(100% - ${DRAWER_WIDTH + WP_MENU_WIDTH_LG}px)`,
					},
				},
			} }
		>
			<Toolbar
				variant="dense"
				sx={ {
					bgcolor: 'background.paper',
					borderBottom: 1,
					borderColor: 'divider',
					px: 2,
					height: { xs: 'auto', xl: APP_BAR_HEIGHT },
					minHeight: APP_BAR_HEIGHT,
					overflow: 'hidden',
					gap: 2,
				} }
			>
				{ isMobile && (
					<IconButton
						edge="start"
						onClick={ () => setMobileOpen( true ) }
						sx={ { mr: 1, color: 'text.primary' } }
					>
						<MenuIcon />
					</IconButton>
				) }


				<Stack direction="row" alignItems="center" gap={ 2 }>
					<Stack minWidth={150}>
						<Typography
							variant="h6"
							fontWeight={ 600 }
							color="text.primary"
							sx={ { lineHeight: 1.2 } }
						>
							{ activeMenuItem?.label || '' }
						</Typography>
					</Stack>
				</Stack>

				<Stack flex={ 1 }/>

				<Stack direction="row" gap={ 2 } alignItems="center">
					<Documentation
						page="getting-started"
						buttonText="Doc."
					/>

					{ showSaveButton && (
						<Box>
							<Button
								variant="contained"
								disableElevation
								size="small"
								onClick={ onSave }
								disabled={ saving || ! formDirty }
							>
								{ __( 'Save', 'bromate-rest-api-firewall' ) }
							</Button>
						</Box>
					) }
				</Stack>
			</Toolbar>
		</AppBar>
		</>
	);
}
