import { useState, useEffect, useCallback } from '@wordpress/element';
import { useAdminData } from '@contexts/AdminDataContext';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import GlobalRoutesPolicy from '@features/routes/GlobalRoutesPolicy';
import RoutesPolicyTree from '@features/routes/RoutesPolicyTree';

export default function Routes() {
    const { adminData } = useAdminData();
    const nonce = adminData?.nonce;
    const { __ } = wp.i18n || {};
    const focusRoute = subKey?.startsWith( 'routes|' ) ? subKey.slice( 'routes|'.length ) : null;
    
    const [ globalSettings, setGlobalSettings ] = useState( {
        enforce_auth:             false,
        enforce_rate_limit:       false,
        hide_user_routes:         false,
        hide_batch_routes:        false,
        hide_oembed_routes:       false,
        disable_behavior:         '404',
        disable_redirect_url:     '',
        disable_redirect_page_id: '',
        disabled_methods:         [],
        disabled_post_types:      [],
    } );


    const handleMethodToggle = ( method ) => ( e ) => {
        const lower = method.toLowerCase();
        const current = globalSettings.disabled_methods || [];
        const next = e.target.checked
            ? [ ...new Set( [ ...current, lower ] ) ]
            : current.filter( ( m ) => m !== lower );
        setGlobalSettings( ( prev ) => ( { ...prev, disabled_methods: next } ) );
    };

    const loadRoutesSettings = useCallback( async () => {
        try {
            const response = await fetch( adminData.ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: new URLSearchParams( {
                    action: 'bromate_get_routes_settings',
                    nonce,
                    id: selectedApplicationId,
                } ),
            } );
            const result = await response.json();
            if ( result?.success && result.data?.settings ) {

                const settings = result.data.settings || {};
                setGlobalSettings( {
                    enforce_auth:             !! settings.enforce_auth,
                    enforce_rate_limit:       !! settings.enforce_rate_limit,
                    hide_user_routes:         !! settings.hide_user_routes,
                    hide_batch_routes:        !! settings.hide_batch_routes,
                    hide_oembed_routes:       !! settings.hide_oembed_routes,
                    disable_behavior:         settings.disable_behavior         || '404',
                    disable_redirect_url:     settings.disable_redirect_url     || '',
                    disable_redirect_page_id: settings.disable_redirect_page_id || '',
                    disabled_methods:         settings.disabled_methods         || [],
                    disabled_post_types:      settings.disabled_post_types      || [],
                } );
            }
        } catch {}
    }, [ adminData, nonce ] );

    const saveRoutesSettings = useCallback( () => {
        const existingSettings = appEntry.settings || {};
        save(
            {
                action:   'bromate_update_routes_options',
                id:       selectedApplicationId,
                title:    appEntry.title || '',
                settings: JSON.stringify( { ...globalSettings } ),
            },
            {
                confirmTitle:   __( 'Save Routes Policy', 'bromate-rest-api-firewall' ),
                confirmMessage: __( 'Save routes policy settings for this application?', 'bromate-rest-api-firewall' ),
                successTitle:   __( 'Routes Policy Saved', 'bromate-rest-api-firewall' ),
                successMessage: __( 'Routes policy saved successfully.', 'bromate-rest-api-firewall' ),
                onSuccess: loadRoutesSettings,
            }
        );
    }, [ globalSettings,  __ ] );

    useEffect( () => {
        loadRoutesSettings();
    }, [ loadRoutesSettings ] );

    return (
        <Stack py={4} flexGrow={ 1 } spacing={ 3 }>
        
            <Stack px={4} spacing={ 3 }>
                <Alert severity="info" sx={ { maxWidth: 640 } }>
                    { __( 'These settings apply globally to all routes. They can be overridden on a per-route basis in the "Per Route Settings" tab.', 'bromate-rest-api-firewall' ) }
                </Alert>
                <GlobalRoutesPolicy
                    form={ form }
                    globalSettings={ globalSettings }
                    onMethodToggle={ handleMethodToggle }
                    onSave={ saveRoutesPolicy }
                    isModuleEnabled={ isModuleEnabled }
                />
            </Stack>
    
            <Stack  px={4} sx={ { flexGrow: 1 } }>
                <RoutesPolicyTree
                    form={ globalSettings }
                    focusRoute={ focusRoute }
                />
            </Stack>
        
        </Stack>
    );
}
