import { rehydrateCascade } from './routesPolicyUtils';

export function treeReducer( state, action ) {
	switch ( action.type ) {
		case 'TOGGLE_CUSTOM':
			return rehydrateCascade(
				toggleCustom( state, action.id, action.effectiveValues )
			);
		case 'TOGGLE_NODE':
			return rehydrateCascade(
				toggleNode(
					state,
					action.id,
					action.key,
					action.effectiveValues
				)
			);
		case 'OVERRIDE_NODE':
			return rehydrateCascade(
				overrideNode(
					state,
					action.id,
					action.key,
					action.value,
					action.effectiveValues
				)
			);
		case 'RESET_ALL_OVERRIDES':
			return rehydrateCascade( resetAllOverrides( state ) );
		case 'RESET':
			return action.payload;
		default:
			return state;
	}
}

/**
 * Snapshot helper — builds the custom-mode settings object from effective values.
 * @param existing
 * @param effectiveValues
 */
function snapshotSettings( existing, effectiveValues ) {
	return {
		...existing,
		custom: true,
		protect: {
			value: !! effectiveValues?.protect,
			inherited: false,
			overridden: true,
		},
		rate_limit: {
			value: !! effectiveValues?.rate_limit,
			inherited: false,
			overridden: true,
		},
		disabled: {
			value: !! effectiveValues?.disabled,
			inherited: false,
			overridden: true,
		},
	};
}

function toggleCustom( items, id, effectiveValues ) {
	return items.map( ( item ) => {
		if ( item.id === id ) {
			if ( item.settings?.custom ) {
				return {
					...item,
					settings: {
						...item.settings,
						custom: false,
						protect: {
							value: false,
							inherited: true,
							overridden: false,
						},
						rate_limit: {
							value: false,
							inherited: true,
							overridden: false,
						},
						disabled: {
							value: false,
							inherited: true,
							overridden: false,
						},
					},
				};
			}
			return {
				...item,
				settings: snapshotSettings( item.settings, effectiveValues ),
			};
		}
		if ( item.children?.length ) {
			return {
				...item,
				children: toggleCustom( item.children, id, effectiveValues ),
			};
		}
		return item;
	} );
}

function toggleNode( items, id, key, effectiveValues ) {
	return items.map( ( item ) => {
		if ( item.id === id ) {
			const newSettings = item.settings?.custom
				? { ...item.settings }
				: snapshotSettings( item.settings, effectiveValues );

			const currentVal = newSettings[ key ]?.value ?? false;
			newSettings[ key ] = {
				value: ! currentVal,
				inherited: false,
				overridden: true,
			};

			return { ...item, settings: newSettings };
		}
		if ( item.children?.length ) {
			return {
				...item,
				children: toggleNode( item.children, id, key, effectiveValues ),
			};
		}
		return item;
	} );
}

function overrideNode( items, id, key, value, effectiveValues ) {
	return items.map( ( item ) => {
		if ( item.id === id ) {
			const newSettings = item.settings?.custom
				? { ...item.settings }
				: snapshotSettings( item.settings, effectiveValues );

			newSettings[ key ] = { value, inherited: false, overridden: true };

			return { ...item, settings: newSettings };
		}
		if ( item.children?.length ) {
			return {
				...item,
				children: overrideNode(
					item.children,
					id,
					key,
					value,
					effectiveValues
				),
			};
		}
		return item;
	} );
}

function resetAllOverrides( items ) {
	return items.map( ( item ) => {
		const newSettings = { ...item.settings };
		for ( const key of [ 'protect', 'rate_limit', 'disabled' ] ) {
			if ( newSettings[ key ] ) {
				newSettings[ key ] = {
					value: false,
					inherited: true,
					overridden: false,
				};
			}
		}
		newSettings.custom = false;
		return {
			...item,
			settings: newSettings,
			children: item.children ? resetAllOverrides( item.children ) : [],
		};
	} );
}
