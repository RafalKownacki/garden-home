import { appRegistry } from "../../../shared/app-registry.js";
import type { HomeAppCard, UserAccessProfile } from "../../../shared/app-types.js";
import { hasAccess } from "./access-evaluator.js";

export function listAppsForUser(user: UserAccessProfile): HomeAppCard[] {
  return appRegistry
    .filter((entry) => hasAccess(entry, user))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      url: entry.url,
      category: entry.category
    }));
}
