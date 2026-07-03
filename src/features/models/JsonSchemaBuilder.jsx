import { useCallback } from '@wordpress/element';
import { alpha } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from '@wordpress/element';
import ListItemText from '@mui/material/ListItemText';

import { FiltersMenu } from '@features/models/Properties';

const TYPE_COLORS = {
    string: 'default',
    number: 'primary',
    boolean: 'info',
    object: 'secondary',
    array: 'warning',
    null: 'default',
};

const MAX_DEPTH = 3;

function PropertyRow( {
    propKey,
    propDef,
    onUpdate,
    onRemove,
    availableBindings,
    readOnly,
    depth,
    maxDepth = MAX_DEPTH,
} ) {
    const { __ } = wp.i18n || {};
    const [ expanded, setExpanded ] = useState(
        () => propDef.type === 'object' && ! propDef.bind && ! propDef.isStatic
    );
    const [ localKey, setLocalKey ] = useState( propDef._autoKey ? '' : propKey );

    const type = propDef.type || 'string';
    const bind = propDef.bind || '';
    const staticVal = propDef.staticValue || '';
    const properties = propDef.properties || {};

    const isManualObject = type === 'object' && ! bind && ! propDef.isStatic;

    const bindingFilters = bind
        ? ( availableBindings.find( ( b ) => b.key === bind )?.filters || [] )
        : [];

    const update = ( patch ) => onUpdate( propKey, { ...propDef, ...patch } );

    const handleKeyBlur = () => {
        if ( localKey !== propKey || propDef._autoKey ) {
            const cleanDef = { ...propDef };
            delete cleanDef._autoKey;
            onUpdate( propKey, cleanDef, localKey || propKey );
        }
    };

    const handleAddSub = ( addType = 'string' ) => {
        let subIdx = Object.keys( properties ).length + 1;
        let subKey = `property_${ subIdx }`;
        while ( properties[ subKey ] !== undefined ) {
            subIdx++;
            subKey = `property_${ subIdx }`;
        }
        const def =
            addType === 'object'
                ? { type: 'object', _autoKey: true }
                : addType === 'static'
                ? { type: 'string', isStatic: true, _autoKey: true }
                : { type: 'string', bind: '', _autoKey: true };
        update( { properties: { ...properties, [ subKey ]: def } } );
        setExpanded( true );
    };

    const handleSubUpdate = ( subKey, subDef, newSubKey ) => {
        if ( newSubKey && newSubKey !== subKey ) {
            const rebuilt = {};
            for ( const [ k, v ] of Object.entries( properties ) ) {
                rebuilt[ k === subKey ? newSubKey : k ] =
                    k === subKey ? subDef : v;
            }
            update( { properties: rebuilt } );
        } else {
            update( { properties: { ...properties, [ subKey ]: subDef } } );
        }
    };

    const handleSubRemove = ( subKey ) => {
        const updated = { ...properties };
        delete updated[ subKey ];
        update( { properties: updated } );
    };

    return (
        <Stack
            sx={ {
                pl: depth > 0 ? 2 : 0,
                borderLeft: depth > 0 ? '2px solid' : 'none',
                borderColor: 'divider',
            } }
        >
            <Stack
                direction="row"
                gap={ 1 }
                py={ 0.75 }
                alignItems="center"
                sx={ ( theme ) => ( {
                    borderRadius: 0.75,
                    px: 0.5,
                    mx: -0.5,
                    bgcolor: alpha( theme.palette.text.primary, 0.025 + depth * 0.02 ),
                    transition: 'background-color 0.15s',
                    '&:hover': {
                        bgcolor: alpha( theme.palette.text.primary, 0.055 + depth * 0.02 ),
                    },
                } ) }
            >
                { isManualObject ? (
                    <IconButton
                        size="small"
                        onClick={ () => setExpanded( ( v ) => ! v ) }
                        sx={ {
                            p: 0.25,
                            transform: expanded
                                ? 'rotate(0deg)'
                                : 'rotate(-90deg)',
                            transition: 'transform 0.2s',
                            flexShrink: 0,
                        } }
                    >
                        <ExpandMoreIcon
                            fontSize="small"
                            sx={ { fontSize: 18 } }
                        />
                    </IconButton>
                ) : (
                    <Box sx={ { width: 26, flexShrink: 0 } } />
                ) }

                { ! propDef.isStatic && ! isManualObject &&
                    availableBindings && availableBindings.length > 0 && (
                    <FormControl
                        size="small"
                        required
                        sx={ { flex: 1, maxWidth: 300 } }
                        disabled={ readOnly }
                    >
                        <InputLabel sx={ { fontSize: '0.8rem' } }>
                            { __( 'Select a source', 'rest-api-firewall' ) }
                        </InputLabel>
                        <Select
                            value={ bind }
                            label={ __( 'Select a source', 'rest-api-firewall' ) }
                            onChange={ ( e ) => {
                                const newBind = e.target.value;
                                if ( newBind ) {
                                    const inferredType =
                                        availableBindings.find(
                                            ( b ) => b.key === newBind
                                        )?.type || 'string';
                                    onUpdate(
                                        propKey,
                                        {
                                            ...propDef,
                                            bind: newBind,
                                            type: inferredType,
                                            staticValue: '',
                                        }
                                    );
                                }
                            } }
                            renderValue={ ( val ) => {
                                const found = availableBindings.find(
                                    ( o ) => o.key === val
                                );
                                return found?.key ?? val;
                            } }
                        >
                            { availableBindings.map( ( b ) => (
                                <MenuItem key={ b.key } value={ b.key }>
                                    <ListItemText
                                        primary={ b.key }
                                        secondary={
                                            b.label && b.label !== b.key
                                                ? b.label
                                                : null
                                        }
                                    />
                                </MenuItem>
                            ) ) }
                        </Select>
                    </FormControl>
                ) }

                { ! propDef.isStatic && ! isManualObject && ! readOnly && (
                    <IconButton
                        size="small"
                        disabled={ ! bind }
                        title={ __( 'Copy property name from source', 'rest-api-firewall' ) }
                        onClick={ () => {
                            const inferredKey = bind.split( '.' ).pop();
                            if ( inferredKey ) {
                                setLocalKey( inferredKey );
                                const cleanDef = { ...propDef };
                                delete cleanDef._autoKey;
                                onUpdate( propKey, cleanDef, inferredKey );
                            }
                        } }
                        sx={ { flexShrink: 0 } }
                    >
                        <ContentCopyIcon sx={ { fontSize: 16 } } />
                    </IconButton>
                ) }

                <TextField
                    size="small"
                    value={ localKey }
                    onChange={ ( e ) => setLocalKey( e.target.value ) }
                    onBlur={ handleKeyBlur }
                    disabled={ readOnly }
                    placeholder={ isManualObject ? __( 'my_object_name', 'rest-api-firewall' ) : __( 'my_property_name', 'rest-api-firewall' ) }
                    sx={ {
                        flex: 1,
                        maxWidth: 300,
                        '.MuiInputBase-input': {
                            padding: '10.5px 14px!important',
                            minHeight: 'unset!important',
                            height: '25px!important',
                            fontFamily: 'monospace',
                            fontSize: '0.82rem',
                        },
                    } }
                />

                { propDef.isStatic ? (
                    <Select
                        size="small"
                        value={ type || 'string' }
                        onChange={ ( e ) => update( { type: e.target.value, staticValue: '' } ) }
                        disabled={ readOnly }
                        sx={ {
                            fontSize: '0.75rem',
                            height: 30,
                            minWidth: 95,
                            flexShrink: 0,
                            fontFamily: 'monospace',
                            '.MuiSelect-select': { py: '4px' },
                        } }
                    >
                        { [ 'string', 'integer', 'boolean' ].map( ( t ) => (
                            <MenuItem key={ t } value={ t } sx={ { fontFamily: 'monospace', fontSize: '0.8rem' } }>
                                { t }
                            </MenuItem>
                        ) ) }
                    </Select>
                ) : ( bind || isManualObject ) ? (
                    <Chip
                        label={ type || 'string' }
                        size="small"
                        color={ TYPE_COLORS[ type ] || 'default' }
                        sx={ { height: 20, fontSize: '0.7rem', flexShrink: 0 } }
                    />
                ) : null }

                { bindingFilters.length > 0 && (
                    <FiltersMenu
                        filters={ bindingFilters.map( ( f ) => ( {
                            ...f,
                            value: propDef.filters?.[ f.key ] ?? ( f.type === 'search_replace' ? {} : false ),
                        } ) ) }
                        propName={ propKey }
                        isInherit={ false }
                        globalForm={ null }
                        onToggleInherit={ null }
                        setField={ null }
                        basePath=""
                        disabled={ readOnly }
                        hasValidLicense={ true }
                        onSaveFilters={ ( savedFilters ) => {
                            const filters = {};
                            savedFilters.forEach( ( f ) => { filters[ f.key ] = f.value; } );
                            update( { filters } );
                        } }
                        __={ __ }
                    />
                ) }

                { propDef.isStatic && (
                    type === 'boolean' ? (
                        <Select
                            size="small"
                            value={ staticVal }
                            onChange={ ( e ) => update( { staticValue: e.target.value } ) }
                            disabled={ readOnly }
                            displayEmpty
                            sx={ {
                                flex: 1,
                                maxWidth: 300,
                                height: 30,
                                fontSize: '0.82rem',
                                fontFamily: 'monospace',
                                '.MuiSelect-select': { py: '4px' },
                            } }
                        >
                            <MenuItem value="" disabled sx={ { fontStyle: 'italic', fontSize: '0.8rem' } }>
                                { __( 'select value', 'rest-api-firewall' ) }
                            </MenuItem>
                            { [ 'true', 'false' ].map( ( v ) => (
                                <MenuItem key={ v } value={ v } sx={ { fontFamily: 'monospace', fontSize: '0.8rem' } }>
                                    { v }
                                </MenuItem>
                            ) ) }
                        </Select>
                    ) : (
                        <TextField
                            size="small"
                            type={ type === 'integer' ? 'number' : 'text' }
                            value={ staticVal }
                            onChange={ ( e ) => update( { staticValue: e.target.value } ) }
                            disabled={ readOnly }
                            placeholder={ type === 'integer' ? '0' : __( 'static value', 'rest-api-firewall' ) }
                            sx={ {
                                flex: 1,
                                maxWidth: 300,
                                '.MuiInputBase-input': {
                                    padding: '10.5px 14px!important',
                                    minHeight: 'unset!important',
                                    height: '25px!important',
                                    fontFamily: 'monospace',
                                    fontSize: '0.82rem',
                                },
                            } }
                        />
                    )
                ) }

                { ! readOnly && (
                    <IconButton
                        size="small"
                        color="error"
                        onClick={ () => onRemove( propKey ) }
                        sx={ { flexShrink: 0 } }
                    >
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                ) }
            </Stack>

            { isManualObject && (
                <Collapse in={ expanded }>
                    <Stack spacing={ 0 } sx={ { mt: 0.5, borderRadius: 1, py: 0.5, px: 0.5 } }>
                        { Object.entries( properties ).map(
                            ( [ subKey, subDef ] ) => (
                                <PropertyRow
                                    key={ subKey }
                                    propKey={ subKey }
                                    propDef={
                                        typeof subDef === 'object' &&
                                        subDef !== null
                                            ? subDef
                                            : { type: 'string' }
                                    }
                                    onUpdate={ handleSubUpdate }
                                    onRemove={ handleSubRemove }
                                    availableBindings={ availableBindings }
                                    readOnly={ readOnly }
                                    depth={ depth + 1 }
                                    maxDepth={ maxDepth }
                                />
                            )
                        ) }
                        { ! readOnly && (
                            <Stack direction="row" gap={ 0.5 } mt={ 0.5 } ml={ 4 } flexWrap="wrap">
                        <>
                                <Button size="small" startIcon={ <AddIcon sx={ { fontSize: '14px !important' } } /> } onClick={ () => handleAddSub( 'string' ) } sx={ { textTransform: 'none', fontSize: '0.72rem', py: 0.25, px: 0.75, minHeight: 0 } }>
                                    { __( 'Add property', 'rest-api-firewall' ) }
                                </Button>
                                { depth + 1 < maxDepth && (
                                    <Button size="small" startIcon={ <AddIcon sx={ { fontSize: '14px !important' } } /> } onClick={ () => handleAddSub( 'object' ) } sx={ { textTransform: 'none', fontSize: '0.72rem', py: 0.25, px: 0.75, minHeight: 0 } }>
                                        { __( 'New object', 'rest-api-firewall' ) }
                                    </Button>
                                ) }
                                <Button size="small" startIcon={ <AddIcon sx={ { fontSize: '14px !important' } } /> } onClick={ () => handleAddSub( 'static' ) } sx={ { textTransform: 'none', fontSize: '0.72rem', py: 0.25, px: 0.75, minHeight: 0 } }>
                                    { __( 'Static value', 'rest-api-firewall' ) }
                                </Button>
                            </>
                            </Stack>
                        ) }
                    </Stack>
                </Collapse>
            ) }
        </Stack>
    );
}

export default function JsonSchemaBuilder( {
    value = {},
    onChange,
    availableBindings = [],
    readOnly = false,
    maxDepth = MAX_DEPTH,
} ) {
    const { __ } = wp.i18n || {};

    const handleUpdate = useCallback(
        ( key, def, newKey ) => {
            if ( newKey && newKey !== key ) {
                const next = {};
                for ( const [ k, v ] of Object.entries( value ) ) {
                    next[ k === key ? newKey : k ] =
                        k === key ? def : v;
                }
                onChange( next );
            } else {
                onChange( { ...value, [ key ]: def } );
            }
        },
        [ value, onChange ]
    );

    const handleRemove = useCallback(
        ( key ) => {
            const next = { ...value };
            delete next[ key ];
            onChange( next );
        },
        [ value, onChange ]
    );

    const handleAdd = useCallback(
        ( addType = 'string' ) => {
            let idx = Object.keys( value ).length + 1;
            let key = `property_${ idx }`;
            while ( value[ key ] !== undefined ) {
                idx++;
                key = `property_${ idx }`;
            }
            const def =
                addType === 'object'
                    ? { type: 'object', _autoKey: true }
                    : addType === 'static'
                    ? { type: 'string', isStatic: true, _autoKey: true }
                    : { type: 'string', bind: '', _autoKey: true };
            onChange( { ...value, [ key ]: def } );
        },
        [ value, onChange ]
    );

    return (
        <Stack spacing={ 0 }>

            { Object.entries( value ).map( ( [ key, def ] ) => (
                <PropertyRow
                    key={ key }
                    propKey={ key }
                    propDef={
                        typeof def === 'object' && def !== null
                            ? def
                            : { type: 'string' }
                    }
                    onUpdate={ handleUpdate }
                    onRemove={ handleRemove }
                    availableBindings={ availableBindings }
                    readOnly={ readOnly }
                    depth={ 0 }
                    maxDepth={ maxDepth }
                />
            ) ) }

            { ! readOnly && ( () => {
                const compact = Object.keys( value ).length > 0;
                const btnSx = compact
                    ? { textTransform: 'none', fontSize: '0.72rem', py: 0.25, px: 0.75, minHeight: 0 }
                    : {};
                const btnSize = compact ? 'small' : 'medium';
                const iconSx = compact ? { fontSize: '14px !important' } : {};
                return (
                    <Stack direction="row" gap={ 0.5 } mt={ 1 } flexWrap="wrap">
                        <Button size={ btnSize } startIcon={ <AddIcon sx={ iconSx } /> } onClick={ () => handleAdd( 'string' ) } sx={ btnSx }>
                            { __( 'Add property', 'rest-api-firewall' ) }
                        </Button>
                        <Button size={ btnSize } startIcon={ <AddIcon sx={ iconSx } /> } onClick={ () => handleAdd( 'object' ) } sx={ btnSx }>
                            { __( 'New object', 'rest-api-firewall' ) }
                        </Button>
                        <Button size={ btnSize } startIcon={ <AddIcon sx={ iconSx } /> } onClick={ () => handleAdd( 'static' ) } sx={ btnSx }>
                            { __( 'Static value', 'rest-api-firewall' ) }
                        </Button>
                    </Stack>
                );
            } )() }
        </Stack>
    );
}