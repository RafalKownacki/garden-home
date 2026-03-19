import type { AppRegistryEntry, UserAccessProfile } from "../../../shared/app-types.js";

export function hasAccess(app: AppRegistryEntry, user: UserAccessProfile): boolean {
  if (!app.enabled) return false;
  if (!app.visibleInHome) return false;
  if (app.environment !== "prod") return false;
  if (!app.access.length) return false;

  return app.access.some((rule) => {
    if (rule.source === "realm") {
      return rule.anyRoles.some((role) => user.realmRoles.includes(role));
    }

    if (!rule.clientId) return false;
    const roles = user.clientRoles[rule.clientId] ?? [];
    return rule.anyRoles.some((role) => roles.includes(role));
  });
}
