import {
	createContext,
	useContext,
	useState,
	useEffect,
} from '@wordpress/element';
import { useAdminData } from './AdminDataContext';

const DocumentationContext = createContext( null );

export const DocumentationProvider = ( { children } ) => {
	const { adminData } = useAdminData();

	const [ open, setOpen ] = useState( false );
	const [ docs, setDocs ] = useState( [] );
	const [ currentLocation, setCurrentLocation ] = useState( null );
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( null );

	const loadDocs = async () => {
		setLoading( true );
		setError( null );

		try {
			const formData = new FormData();
			formData.append( 'action', 'bromate_rest_api_firewall_documentation' );
			formData.append( 'nonce', adminData.nonce );

			const response = await fetch( adminData.ajaxurl, {
				method: 'POST',
				body: formData,
			} );

			const result = await response.json();

			if ( result.success && Array.isArray( result.data ) ) {
				setDocs( result.data );
				setCurrentLocation( { page: result.data[ 0 ]?.slug } );
			}
		} catch ( e ) {
			setError( `Failed to load documentation: ${ e.message }` );
		} finally {
			setLoading( false );
		}
	};

	const openDoc = ( { page, anchor } ) => {
		setCurrentLocation( { page, anchor } );
		setOpen( true );
	};

	const closeDoc = () => setOpen( false );

	useEffect( () => {
		if ( open && docs.length === 0 ) {
			loadDocs();
		}
	}, [ open ] );

	return (
		<DocumentationContext.Provider
			value={ {
				open,
				openDoc,
				closeDoc,
				currentLocation,
				docs,
				loading,
				error,
			} }
		>
			{ children }
		</DocumentationContext.Provider>
	);
};

export const useDocumentation = () => {
	const ctx = useContext( DocumentationContext );
	if ( ! ctx ) {
		throw new Error(
			'useDocumentation must be used inside DocumentationProvider'
		);
	}
	return ctx;
};
