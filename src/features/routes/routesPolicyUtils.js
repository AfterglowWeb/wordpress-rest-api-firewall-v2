export function isNodeCustom( settings ) {
	return !! settings?.custom;
}

const CORE_NAMESPACES = new Set( [ 'wp', 'oembed', 'batch', 'wp-site-health', 'wp-abilities', 'wp-block-editor' ] );

/**
 * Returns true when the node belongs to a plugin REST namespace (not a WP core namespace).
 * Plugin route settings are global (shared across all applications).
 */
export function isPluginRoute( node ) {
	const first = ( node?.path || '' ).replace( /^\//, '' ).split( '/' )[ 0 ];
	return !! first && ! CORE_NAMESPACES.has( first );
}

export function countCustomDescendants( node ) {
	let count = 0;
	for ( const child of node.children || [] ) {
		if ( isNodeCustom( child.settings ) ) {
			count++;
		}
		count += countCustomDescendants( child );
	}
	return count;
}

export { countCustomDescendants as countModifiedDescendants };

export function countAllCustomNodes( nodes ) {
	let count = 0;
	for ( const node of nodes || [] ) {
		if ( isNodeCustom( node.settings ) ) {
			count++;
		}
		count += countAllCustomNodes( node.children );
	}
	return count;
}

export function isTrulyCustomized( settings ) {
	return isNodeCustom( settings );
}

export function findNodeById( items, id ) {
	for ( const item of items ) {
		if ( item.id === id ) {
			return item;
		}
		if ( item.children ) {
			const found = findNodeById( item.children, id );
			if ( found ) {
				return found;
			}
		}
	}
	return null;
}

export function getAllDescendantMethodIds( node ) {
	const ids = [];
	const collect = ( children ) => {
		for ( const child of children || [] ) {
			if ( child.isMethod ) {
				ids.push( child.id );
			}
			if ( child.children?.length ) {
				collect( child.children );
			}
		}
	};
	collect( node?.children );
	return ids;
}

export function rehydrateCascade( nodes, parentValues = null ) {
	return ( nodes || [] ).map( ( node ) => {
		const settings = node.settings ?? {};
		const updatedSettings = { ...settings };

		if ( ! settings.custom && parentValues ) {
			for ( const key of [ 'protect', 'rate_limit', 'disabled' ] ) {
				updatedSettings[ key ] = {
					value: parentValues[ key ],
					inherited: true,
					overridden: false,
				};
			}
		}

		const childValues = {
			protect: updatedSettings.protect?.value ?? false,
			rate_limit: updatedSettings.rate_limit?.value ?? false,
			disabled: updatedSettings.disabled?.value ?? false,
		};

		return {
			...node,
			settings: updatedSettings,
			children: node.children?.length
				? rehydrateCascade( node.children, childValues )
				: node.children || [],
		};
	} );
}

export { rehydrateCascade as rehydrateApplyToChildren };

export function propagateToDescendants( children, key, value ) {
	return ( children || [] ).map( ( child ) => {
		if ( child.settings?.custom ) {
			return child;
		}
		const updated = {
			...child,
			settings: {
				...child.settings,
				[ key ]: { value, inherited: true, overridden: false },
			},
		};
		if ( updated.children?.length ) {
			updated.children = propagateToDescendants(
				updated.children,
				key,
				value
			);
		}
		return updated;
	} );
}

export function normalizeTree( nodes, parentPath = '', parentSettings = null ) {
	if ( ! nodes || ! Array.isArray( nodes ) ) {
		return [];
	}

	const normalized = nodes.map( ( node ) => {
		const nodePath = node.path || `${ parentPath }/${ node.label }`;
		const nodeSettings = {
			protect: {
				value: false,
				inherited: false,
				overridden: false,
			},
			disabled: {
				value: false,
				inherited: false,
				overridden: false,
			},
			rate_limit: {
				value: false,
				inherited: false,
				overridden: false,
			},
			rate_limit_time: {
				value: false,
				inherited: false,
				overridden: false,
			},
			custom: false,
		};

		if ( node.settings ) {
			if ( node.settings.protect !== undefined ) {
				nodeSettings.protect = {
					value: !! node.settings.protect,
					inherited: false,
					overridden: !! (
						node.settings.protect_overridden ?? false
					),
				};
			}
			if ( node.settings.disabled !== undefined ) {
				nodeSettings.disabled = {
					value: !! node.settings.disabled,
					inherited: false,
					overridden: !! (
						node.settings.disabled_overridden ?? false
					),
				};
			}
			if ( node.settings.rate_limit !== undefined ) {
				nodeSettings.rate_limit = {
					value: !! node.settings.rate_limit,
					inherited: false,
					overridden: !! (
						node.settings.rate_limit_overridden ?? false
					),
				};
			}
			if ( node.settings.rate_limit_time !== undefined ) {
				nodeSettings.rate_limit_time = {
					value: !! node.settings.rate_limit_time,
					inherited: false,
					overridden: false,
				};
			}
			if ( node.settings.custom !== undefined ) {
				nodeSettings.custom = !! node.settings.custom;
			} else if ( node.settings.locked !== undefined ) {
				nodeSettings.custom = !! node.settings.locked;
			}
			if ( node.settings.locked !== undefined ) {
				nodeSettings.locked = !! node.settings.locked;
			}
		}

		const normalizedNode = {
			id: node.id ?? node.uuid ?? crypto.randomUUID(),
			label: node.label,
			path: nodePath,
			settings: nodeSettings,
			permission: node.permission,
			isMethod: node.isMethod ?? false,
			method: node.method,
			route: node.route,
			params: node.params,
			children: [],
		};

		if ( node.children && node.children.length > 0 ) {
			normalizedNode.children = normalizeTree(
				node.children,
				nodePath,
				nodeSettings
			);
		}

		return normalizedNode;
	} );

	if ( parentSettings === null ) {
		return rehydrateCascade( normalized );
	}
	return normalized;
}
