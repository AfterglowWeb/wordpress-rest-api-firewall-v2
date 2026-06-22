import { useContext, memo } from 'react';

import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { TreeItem, useTreeItem } from '@mui/x-tree-view';

import { RoutePolicyTreeContext } from '@contexts/RoutePolicyTreeContext';

function RouteTreeItem(props: any) {
	const { itemId } = props;
    const { getRootProps, getLabelProps } = useTreeItem({ itemId });

	const context = useContext(RoutePolicyTreeContext);

	if (!context) {
		return <TreeItem {...props} />;
	}

	const { toggleSetting, getNode } = context;

	const item = getNode(itemId);

	if (!item) {
		return <TreeItem {...props} />;
	}

	return (
		<TreeItem
            {...getRootProps(props)}
			label={
				<Stack {...getLabelProps()} direction="row" alignItems="center" spacing={1}>
					<Typography>{item.label}</Typography>

					<Switch
						size="small"
						checked={item.settings?.protect?.value ?? false}
						onChange={() =>
							toggleSetting(item.id, 'protect')
						}
					/>
				</Stack>
			}
		/>
	);
}

export default memo(RouteTreeItem);