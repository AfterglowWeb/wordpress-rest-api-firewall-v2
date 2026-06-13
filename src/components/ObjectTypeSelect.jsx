import { useAdminData } from '@contexts/AdminDataContext';
import MultipleSelect from '@components/MultipleSelect';

import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemText from '@mui/material/ListItemText';

const GROUP_LABELS = {
	post_type: ( __ ) => __( 'Posts', 'bromate-rest-api-firewall' ),
	taxonomy: ( __ ) => __( 'Taxonomies', 'bromate-rest-api-firewall' ),
	author: ( __ ) => __( 'Users', 'bromate-rest-api-firewall' ),
};

function buildOptions( items, types, visibility, __, extraGroups = [] ) {
	const result = [];

	for ( const typeKey of types ) {
		const groupItems = items.filter( ( item ) => item.type === typeKey );
		if ( ! groupItems.length ) {
			continue;
		}

		const visibilityFiltered =
			visibility.includes( 'public' ) && visibility.includes( 'private' )
				? groupItems
				: groupItems.filter( ( item ) =>
						visibility.includes( 'public' )
							? item.public
							: ! item.public
				  );

		if ( ! visibilityFiltered.length ) {
			continue;
		}

		const getLabel = GROUP_LABELS[ typeKey ];
		result.push( { groupLabel: getLabel ? getLabel( __ ) : typeKey } );

		const publicItems = visibilityFiltered.filter(
			( item ) => item.public
		);
		const privateItems = visibilityFiltered.filter(
			( item ) => ! item.public
		);
		const useSubGroups = publicItems.length > 0 && privateItems.length > 0;

		const pushItems = ( group, subGroupLabel ) => {
			if ( useSubGroups ) {
				result.push( { subGroupLabel } );
			}
			group.forEach( ( item ) =>
				result.push( {
					value: item.value,
					label: item.label,
					secondary: item.source
						? item.source
						: item._builtin
							? __( 'builtin', 'bromate-rest-api-firewall' )
							: __( 'custom', 'bromate-rest-api-firewall' ),
				} )
			);
		};

		if ( publicItems.length ) {
			pushItems( publicItems, __( 'Public', 'bromate-rest-api-firewall' ) );
		}
		if ( privateItems.length ) {
			pushItems( privateItems, __( 'Private', 'bromate-rest-api-firewall' ) );
		}
	}

	for ( const group of extraGroups ) {
		result.push( { groupLabel: group.groupLabel } );
		group.items.forEach( ( item ) => result.push( { value: item.value, label: item.label } ) );
	}

	return result;
}

function renderGroupedChildren( options ) {
	return options.map( ( option, index ) => {
		if ( option.groupLabel ) {
			return (
				<ListSubheader
					key={ `group-${ option.groupLabel }` }
					sx={ {
						fontWeight: 700, 
						fontSize: '0.75rem', 
						lineHeight: '28px', 
						textTransform: 'uppercase', 
						letterSpacing: 0.5 
					} }
				>
					{ option.groupLabel }
				</ListSubheader>
			);
		}

		if ( option.subGroupLabel ) {
			return (
				<ListSubheader
					key={ `subgroup-${ option.subGroupLabel }-${ index }` }
					sx={ {
						pl: 3,
						fontSize: '0.75rem',
						lineHeight: '24px',
						letterSpacing: 0.4,
					} }
				>
					{ option.subGroupLabel }
				</ListSubheader>
			);
		}

		return option?.value !== null && option?.label ? (
			<MenuItem
				key={ option.value }
				value={ option.value }
				sx={ { pl: 4 } }
			>
				<ListItemText
					primary={ option.label }
					secondary={ option.secondary ?? null }
				/>
			</MenuItem>
		) : null;
	} );
}

export default function ObjectTypeSelect( {
	types = [ 'post_type', 'taxonomy' ],
	visibility = [ 'public', 'private' ],
	extraGroups = [],
	isSingle = false,
	name,
	label,
	value,
	onChange,
	helperText,
	disabled,
	sx,
} ) {
	const { adminData } = useAdminData();
	const { __ } = wp.i18n || {};

	if ( ! adminData?.post_types ) {
		return null;
	}

	const options = buildOptions( adminData.post_types, types, visibility, __, extraGroups );

	if ( isSingle ) {
		return (
			<FormControl fullWidth sx={ sx } disabled={ disabled }>
				<InputLabel id={ `${ name }-label` }>{ label }</InputLabel>
				<Select
					labelId={ `${ name }-label` }
					id={ name }
					name={ name }
					value={ value ?? '' }
					onChange={ onChange }
					input={ <OutlinedInput label={ label } /> }
					renderValue={ ( val ) => {
						const found = options.find( ( o ) => o.value === val );
						return found?.label ?? val;
					} }
					MenuProps={ {
						PaperProps: {
							style: { maxHeight: 48 * 9 + 8, width: 250 },
						},
					} }
				>
					{ renderGroupedChildren( options ) }
				</Select>
				{ helperText && (
					<FormHelperText>{ helperText }</FormHelperText>
				) }
			</FormControl>
		);
	}

	return (
		<MultipleSelect
			name={ name }
			label={ label }
			value={ value }
			onChange={ onChange }
			helperText={ helperText }
			disabled={ disabled }
			sx={ sx }
			options={ options }
		/>
	);
}
