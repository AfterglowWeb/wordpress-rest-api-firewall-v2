import { useAdminData } from '../contexts/AdminDataContext';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';

const AppLogo = styled( Box )( () => ( {
	height: 48,
	padding: '0 12px',
	background: 'linear-gradient(307deg, #ffb7c4 0%, #ff002e 100%)',
	borderRadius: 0,
	fontSize: '1.4rem',
	fontWeight: 800,
	color: '#fff',
	letterSpacing: '-0.02em',
	fontStyle: 'italic',
	position: 'relative',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	
} ) );

export default function AppIdentity() {
	const { __ } = wp.i18n || {};
	const { adminData } = useAdminData();

	return (
		<Box
			sx={ {
				p: 2,
				height: 75,
				display: 'flex',
				alignItems: 'center',
				gap: 1,
				boxSizing: 'border-box',
			} }
		>
			<AppLogo>WAL</AppLogo>
			<Box>
				<Typography 
				textTransform="uppercase" 
				variant="subtitle2" 
				lineHeight={1} 
				fontWeight={ 600 }>
					{ adminData.plugin_name }
				</Typography>
			</Box>
		</Box>
	);
}
