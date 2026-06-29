export type InheritableSetting = {
  value: boolean;
  inherited?: boolean;
  overridden?: boolean;
};

export type RouteSettings = {
  disabled:  InheritableSetting;  // bloquer la route
  protect:   InheritableSetting;  // restreindre aux users autorisés
  tags:      string[];
  custom?:   boolean;
};

export type RouteNode = {
  id:          string;
  label:       string;
  path:        string;
  method?:     string;
  route?:      string;
  params?:     { name: string; regex: string }[];
  isMethod?:   boolean;
  callback?:   string;
  permission?: { type: string; callback: string | null };
  settings:    RouteSettings;
  children?:   RouteNode[];
};

// RoutesSettings reste pour les options globales du plugin
export type RoutesSettings = {
  routes_policy_enabled:           boolean;
  routes_policy_default_hidden_routes:     boolean;
  routes_policy_hidden_methods:    string[];
  routes_policy_hidden_wp_objects: string[];
  routes_policy_hidden_response_code: '401' | '403' | '404';
};

export type Props = {
	tree: RouteNode;
	onChange: (tree: RouteNode) => void;
};

export type RoutesPolicyTreeProps = {
  tree:     RouteNode[];
  onChange: (tree: RouteNode[]) => void;
};

export type ToggleableSettingKey = {
  [K in keyof RouteSettings]-?:
    RouteSettings[K] extends InheritableSetting ? K : never;
}[keyof RouteSettings];

export type RoutePolicyTreeContextType = {
	toggleSetting: (
		id: string,
		key: ToggleableSettingKey
	) => void;
};