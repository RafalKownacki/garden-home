import type { HomeAppCard, UserAccessProfile } from "../../../shared/app-types.js";
import { hasAccess } from "./access-evaluator.js";
import { loadRegistry } from "./registry-store.js";

export async function listAppsForUser(user: UserAccessProfile): Promise<HomeAppCard[]> {
  const registry = await loadRegistry();
  return registry
    .filter((entry) => hasAccess(entry, user))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      url: entry.url,
      category: entry.category
    }));
}
