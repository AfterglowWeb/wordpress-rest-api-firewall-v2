import type { PropsWithChildren } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';

const appTheme = createTheme({
	palette: {
		mode: 'light',
		primary: {
			main: '#2271b1',
		},
		error: {
			main: '#dc2626',
		},
	},
	breakpoints: {
		values: {
			xs: 0,
			sm: 640,
			md: 780,
			lg: 960,
			xl: 1280,
		},
	},
});

export default function AppTheme({
	children,
}: PropsWithChildren): JSX.Element {
	return (
		<ThemeProvider theme={appTheme}>
			{children}
		</ThemeProvider>
	);
}