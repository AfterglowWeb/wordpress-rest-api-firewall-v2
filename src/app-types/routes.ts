export type InheritableSetting = {
	value: boolean;
	inherited?: boolean;
	overridden?: boolean;
};

export type RouteSettings = {
	protect: InheritableSetting;
	disabled: InheritableSetting;
	rate_limit: InheritableSetting;

	custom: boolean;
	locked: boolean;

	tags: string[];
};

export type RouteNode = {
	id: string;
	label: string;
	path: string;

	method?: string;
	route?: string;

	settings: RouteSettings;

	children?: RouteNode[];
};

export type RoutesSettings = {
	routes_policy_enabled: boolean;

	routes_policy_rules: RouteNode;

	routes_policy_hidden_routes: string[];

	routes_policy_hidden_methods: string[];

	routes_policy_hidden_post_types: string[];

	routes_policy_hidden_response_code:
		| '401'
		| '403'
		| '404';
};

export type Props = {
	tree: RouteNode;
	onChange: (tree: RouteNode) => void;
};

export type RoutesPolicyTreeProps = {
	tree: RouteNode;
	onChange: (tree: RouteNode) => void;
};

export type ToggleableSettingKey = {
	[K in keyof RouteSettings]:
		RouteSettings[K] extends
			| InheritableSetting
			| undefined
			? K
			: never;
}[keyof RouteSettings];

export type RoutePolicyTreeContextType = {
	toggleSetting: (
		id: string,
		key: ToggleableSettingKey
	) => void;
};