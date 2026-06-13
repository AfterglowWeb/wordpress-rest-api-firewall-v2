import {
	createContext,
	useContext,
	useState,
	useCallback,
} from '@wordpress/element';

const DialogContext = createContext( null );

export const DIALOG_TYPES = {
	CONFIRM: 'confirm',
	LOADING: 'loading',
	SUCCESS: 'success',
	ERROR: 'error',
	INFO: 'info',
};

const initialState = {
	open: false,
	type: DIALOG_TYPES.CONFIRM,
	title: '',
	content: '',
	confirmLabel: null,
	cancelLabel: null,
	onConfirm: null,
	onCancel: null,
	autoClose: null,
};

export function DialogProvider( { children } ) {
	const [ dialog, setDialog ] = useState( initialState );

	const openDialog = useCallback( ( options ) => {
		setDialog( {
			...initialState,
			...options,
			open: true,
		} );
	}, [] );

	const updateDialog = useCallback( ( options ) => {
		setDialog( ( prev ) => ( {
			...prev,
			...options,
		} ) );
	}, [] );

	const closeDialog = useCallback( () => {
		setDialog( ( prev ) => ( {
			...prev,
			open: false,
		} ) );
	}, [] );

	const resetDialog = useCallback( () => {
		setDialog( initialState );
	}, [] );

	return (
		<DialogContext.Provider
			value={ {
				dialog,
				openDialog,
				updateDialog,
				closeDialog,
				resetDialog,
				DIALOG_TYPES,
			} }
		>
			{ children }
		</DialogContext.Provider>
	);
}

export function useDialog() {
	const context = useContext( DialogContext );
	if ( ! context ) {
		throw new Error( 'useDialog must be used within a DialogProvider' );
	}
	return context;
}
