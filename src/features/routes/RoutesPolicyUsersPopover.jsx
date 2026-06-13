import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function RoutesPolicyUsersPopover( {
	open,
	anchorEl,
	onClose,
	usersData,
	usersLoading,
	routeIds,
	isBulk,
	onUserAccessChange,
} ) {
	const { __ } = wp.i18n || {};

	return (
		<Popover
			open={ open }
			anchorEl={ anchorEl }
			onClose={ onClose }
			anchorOrigin={ { vertical: 'bottom', horizontal: 'left' } }
			transformOrigin={ { vertical: 'top', horizontal: 'left' } }
		>
			<Box sx={ { p: 2, minWidth: 220, maxWidth: 340 } }>
				<Typography
					variant="subtitle2"
					sx={ { mb: 1, fontWeight: 600 } }
				>
					{ isBulk
						? __(
								'User Access — all children',
								'bromate-rest-api-firewall'
						  )
						: __( 'User Access', 'bromate-rest-api-firewall' ) }
				</Typography>

				{ usersLoading && (
					<Box
						sx={ {
							display: 'flex',
							justifyContent: 'center',
							py: 1,
						} }
					>
						<CircularProgress size={ 20 } />
					</Box>
				) }

				{ ! usersLoading &&
					usersData !== null &&
					usersData.length === 0 && (
						<Typography variant="body2" color="text.secondary">
							{ __(
								'No users configured for this application.',
								'bromate-rest-api-firewall'
							) }
						</Typography>
					) }

				{ ! usersLoading && usersData && usersData.length > 0 && (
					<Stack spacing={ 0 }>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={ { mb: 0.5, fontSize: '0.7rem' } }
						>
							{ isBulk
								? __(
										'Check to restrict user access to all children of this route.',
										'bromate-rest-api-firewall'
								  )
								: __(
										'Check to restrict user access to this route only.',
										'bromate-rest-api-firewall'
								  ) }
						</Typography>

						{ usersData.map( ( user ) => {
							const matchCount = ( routeIds || [] ).filter(
								( id ) =>
									user.related_routes_uuid.includes( id )
							).length;
							const total = ( routeIds || [] ).length;
							const isChecked = total > 0 && matchCount === total;
							const isIndeterminate =
								isBulk && matchCount > 0 && matchCount < total;

							return (
								<FormControlLabel
									key={ user.id }
									control={
										<Checkbox
											size="small"
											checked={ isChecked }
											indeterminate={ isIndeterminate }
											onChange={ ( e ) =>
												onUserAccessChange(
													user.id,
													routeIds,
													e.target.checked
												)
											}
											sx={ { py: 0.5 } }
										/>
									}
									label={
										<Typography variant="body2">
											{ user.display_name }
										</Typography>
									}
								/>
							);
						} ) }
					</Stack>
				) }
			</Box>
		</Popover>
	);
}
