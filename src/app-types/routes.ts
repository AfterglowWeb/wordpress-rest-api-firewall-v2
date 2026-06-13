export type RoutePolicyRules = {
	nodes: unknown[];
	routes: unknown[];
};

export type RoutesSettings = {
    routes_policy_enabled: boolean;
	routes_policy_rules: RoutePolicyRules;
    routes_policy_hidden_routes: string[];
	routes_policy_hidden_methods: string[];
    routes_policy_hidden_post_types: string[];
    routes_policy_hidden_response_code: string;
};