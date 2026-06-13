import { useEffect } from '@wordpress/element';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { useDialog, DIALOG_TYPES } from '../contexts/DialogContext';

export default function ConfirmDialog() {
	const { __ } = wp.i18n || {};
	const { dialog, closeDialog, resetDialog } = useDialog();

	const {
		open,
		type,
		title,
		content,
		confirmLabel,
		cancelLabel,
		onConfirm,
		onCancel,
		autoClose,
	} = dialog;

	useEffect( () => {
		if ( ! open || ! autoClose || autoClose <= 0 ) {
			return;
		}

		const timer = setTimeout( () => {
			closeDialog();
		}, autoClose );

		return () => clearTimeout( timer );
	}, [ open, autoClose, closeDialog ] );

	const handleClose = ( _, reason ) => {
		if ( reason === 'backdropClick' && type === DIALOG_TYPES.LOADING ) {
			return;
		}
		if ( onCancel ) {
			onCancel();
		}
		closeDialog();
	};

	const handleConfirm = () => {
		closeDialog();
		if ( onConfirm ) {
			onConfirm();
		}
	};

	const handleExited = () => {
		resetDialog();
	};

	const getIcon = () => {
		switch ( type ) {
			case DIALOG_TYPES.SUCCESS:
				return (
					<CheckCircleOutlineIcon
						color="success"
						sx={ { fontSize: 48 } }
					/>
				);
			case DIALOG_TYPES.ERROR:
				return (
					<ErrorOutlineIcon color="error" sx={ { fontSize: 48 } } />
				);
			case DIALOG_TYPES.INFO:
				return (
					<InfoOutlinedIcon color="info" sx={ { fontSize: 48 } } />
				);
			default:
				return null;
		}
	};

	const getDefaultTitle = () => {
		switch ( type ) {
			case DIALOG_TYPES.SUCCESS:
				return __( 'Success', 'bromate-rest-api-firewall' );
			case DIALOG_TYPES.ERROR:
				return __( 'Error', 'bromate-rest-api-firewall' );
			case DIALOG_TYPES.INFO:
				return __( 'Information', 'bromate-rest-api-firewall' );
			case DIALOG_TYPES.LOADING:
				return __( 'Please wait…', 'bromate-rest-api-firewall' );
			default:
				return __( 'Confirm', 'bromate-rest-api-firewall' );
		}
	};

	const renderContent = () => {
		if ( type === DIALOG_TYPES.LOADING ) {
			return (
				<Stack spacing={ 2 } sx={ { py: 2 } }>
					{ content && (
						<DialogContentText>{ content }</DialogContentText>
					) }
					<LinearProgress />
				</Stack>
			);
		}

		const icon = getIcon();

		if ( icon ) {
			return (
				<Stack alignItems="center" spacing={ 2 } sx={ { py: 1 } }>
					{ icon }
					{ content && (
						<DialogContentText textAlign="center">
							{ content }
						</DialogContentText>
					) }
				</Stack>
			);
		}

		return content && <DialogContentText>{ content }</DialogContentText>;
	};

	const renderActions = () => {
		if ( type === DIALOG_TYPES.LOADING ) {
			return null;
		}

		if (
			type === DIALOG_TYPES.SUCCESS ||
			type === DIALOG_TYPES.ERROR ||
			type === DIALOG_TYPES.INFO
		) {
			return (
				<DialogActions>
					<Button
						onClick={ handleClose }
						color="primary"
						variant="contained"
					>
						{ confirmLabel || __( 'OK', 'bromate-rest-api-firewall' ) }
					</Button>
				</DialogActions>
			);
		}

		return (
			<DialogActions>
				<Button
					onClick={ handleClose }
					color="default"
					variant="outlined"
				>
					{ cancelLabel || __( 'Cancel', 'bromate-rest-api-firewall' ) }
				</Button>
				<Button
					onClick={ handleConfirm }
					color="primary"
					variant="contained"
					disableElevation
				>
					{ confirmLabel || __( 'Confirm', 'bromate-rest-api-firewall' ) }
				</Button>
			</DialogActions>
		);
	};

	return (
		<Dialog
			open={ open }
			onClose={ handleClose }
			TransitionProps={ { onExited: handleExited } }
			aria-labelledby="dialog-title"
			maxWidth="xs"
			fullWidth
			sx={ { '&': { pl: { xs: 0, md: '160px' } } } }
		>
			<DialogTitle id="dialog-title">
				{ title || getDefaultTitle() }
			</DialogTitle>
			<DialogContent>{ renderContent() }</DialogContent>
			{ renderActions() }
		</Dialog>
	);
}
