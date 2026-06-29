import { useState, useCallback, useMemo } from 'react';
import { RoutePolicyTreeContext } from '@contexts/RoutePolicyTreeContext';

import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import RefreshIcon from '@mui/icons-material/Refresh';

import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

import RouteTreeItem from '@features/routes/RouteTreeItem';

import type {
	RouteNode,
	RoutesPolicyTreeProps,
	ToggleableSettingKey,
	InheritableSetting
} from '@app-types/routes';

type TreeState = {
	rootId: string;
	nodes: Record<string, RouteNode>;
};

function updateNode(
	node: RouteNode,
	id: string,
	updater: (node: RouteNode) => RouteNode
): RouteNode {
	if (node.id === id) {
		return updater(node);
	}

	return {
		...node,
		children: node.children?.map((child) =>
			updateNode(child, id, updater)
		),
	};
}

function countCustomRules(
	node: RouteNode
): number {
	let count = node.settings?.custom ? 1 : 0;

	for (const child of node.children ?? []) {
		count += countCustomRules(child);
	}

	return count;
}

const defaultSetting: InheritableSetting = {
  value: false,
};

function wrapTree(nodes: RouteNode[]): RouteNode {
  return {
    id: '__root__',
    label: 'root',
    path: '/',
    settings: {
      protect: { ...defaultSetting },
      disabled: { ...defaultSetting },
      tags: [],
    },
    children: nodes,
  };
}

function normalizeTree(tree: RouteNode): TreeState {
  const nodes: Record<string, RouteNode> = {};
  function walk(node: RouteNode) {
    nodes[node.id] = node;
    node.children?.forEach(walk);
  }
  walk(tree);
  return { rootId: tree.id, nodes };
}


export default function RoutesPolicyTree({ tree, onChange }: RoutesPolicyTreeProps): JSX.Element {
  	const [state, setState] = useState(() => normalizeTree(wrapTree(tree)));

	const [expandedItems, setExpandedItems] =
		useState<string[]>([]);

	const customCount = useMemo(
	() => tree.reduce((acc, node) => acc + countCustomRules(node), 0),
	[tree]
	);	

	const getNode = useCallback(
		(id: string) => state.nodes[id],
		[state.nodes]
	);


	const memoTree = useMemo(() => {
		const nodes = state.nodes;

		function build(id: string): RouteNode {
			const node = nodes[id];

			return {
				...node,
				children: node.children?.map((child) => build(child.id)),
			};
		}

		return build(state.rootId);
	}, [state]);

	

	const toggleSetting = useCallback(
		(id: string, key: ToggleableSettingKey) => {
			
			setState((prev) => {
				const node = prev.nodes[id];
				if (!node) return prev;


				const updatedNode: RouteNode = {
					...node,
					settings: {
						...node.settings,
						custom: true,
						[key]: {
							value: !(node.settings?.[key]?.value ?? false),
							overridden: true,
						},
					},
				};

				return {
					...prev,
					nodes: {
						...prev.nodes,
						[id]: updatedNode,
					},
				};
			});
		},
		[]
	);

	return (
		<Stack spacing={2}>
			<Typography
				variant="subtitle1"
				fontWeight={600}
			>
				Route Policy Tree
			</Typography>
			<Stack flexDirection={"row"} gap={2}>
				<Chip
					size="small"
					label={`${customCount} custom rules`}
				/>

				<Stack flex={1} />

				<Button
					startIcon={<RefreshIcon />}
				>
					Refresh
				</Button>
			</Stack>
			<RoutePolicyTreeContext.Provider
				value={{
					toggleSetting,
					getNode
				}}>
				<RichTreeView<RouteNode>
					items={memoTree.children ?? []}
					getItemId={(item) => item.id}
					getItemLabel={(item) => item.label}
					expandedItems={expandedItems}
					onExpandedItemsChange={(
						_,
						items
					) => setExpandedItems(
						items as string[]
					)}
					slots={{
						item: RouteTreeItem,
					}}
					
				/>
			</RoutePolicyTreeContext.Provider>

		</Stack>
	);
}