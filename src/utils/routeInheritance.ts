// @utils/routeInheritance.ts

import type { RouteNode, RouteSettings, RoutesSettings, InheritableSetting } from '@app-types/routes';

const DEFAULT_HIDDEN_NAMESPACES = ['wp/v2/users', 'oembed/1.0', 'batch/v1'];

function isGloballyDisabled(node: RouteNode, globals: RoutesSettings): boolean {
  if (globals.routes_policy_default_hidden_routes) {
    if (DEFAULT_HIDDEN_NAMESPACES.some((ns) => node.path.startsWith(`/${ns}`))) {
      return true;
    }
  }

  if (node.isMethod && node.method) {
    if (globals.routes_policy_hidden_methods?.includes(node.method.toLowerCase())) {
      return true;
    }
  }

  if (globals.routes_policy_hidden_wp_objects?.length) {
    if (globals.routes_policy_hidden_wp_objects.some((obj) => node.path.includes(`/${obj}`))) {
      return true;
    }
  }

  return false;
}

function resolveNode(
  node: RouteNode,
  parentDisabled: InheritableSetting,
  parentProtect: InheritableSetting,
  globals: RoutesSettings,
): RouteNode {
  const rawDisabled = (node.settings?.disabled as any) === true || (node.settings?.disabled as any)?.value === true;
  const rawProtect  = (node.settings?.protect  as any) === true || (node.settings?.protect  as any)?.value  === true;
  const isOverriddenDisabled = (node.settings?.disabled as any)?.overridden === true;
  const isOverriddenProtect  = (node.settings?.protect  as any)?.overridden === true;

  const globallyDisabled = isGloballyDisabled(node, globals);

  let disabled: InheritableSetting;
  if (globallyDisabled) {
    disabled = { value: true, inherited: true };
  } else if (parentDisabled.value && !isOverriddenDisabled) {
    disabled = { value: true, inherited: true };
  } else if (rawDisabled) {
    disabled = { value: true, inherited: false, overridden: isOverriddenDisabled };
  } else {
    disabled = { value: false, inherited: false };
  }

  let protect: InheritableSetting;
  if (parentProtect.value && !isOverriddenProtect) {
    protect = { value: true, inherited: true };
  } else if (rawProtect) {
    protect = { value: true, inherited: false, overridden: isOverriddenProtect };
  } else {
    protect = { value: false, inherited: false };
  }

  const resolvedSettings: RouteSettings = {
    ...node.settings,
    disabled,
    protect,
  };

  const resolvedChildren = node.children?.map((child) =>
    resolveNode(child, disabled, protect, globals)
  );

  return {
    ...node,
    settings: resolvedSettings,
    children: resolvedChildren,
  };
}

export function resolveInheritance(
  tree: RouteNode[],
  globals: RoutesSettings,
): RouteNode[] {
  const noInheritance: InheritableSetting = { value: false, inherited: false };
  return tree.map((node) => resolveNode(node, noInheritance, noInheritance, globals));
}