import * as registryModule from "../../../shared/app-registry.js";
import type { AppRegistryEntry, HomeAppCard, UserAccessProfile } from "../../../shared/app-types.js";
import { hasAccess } from "./access-evaluator.js";

const appRegistry: AppRegistryEntry[] =
  "appRegistry" in registryModule && Array.isArray(registryModule.appRegistry)
    ? registryModule.appRegistry
    : "default" in registryModule &&
        registryModule.default &&
        typeof registryModule.default === "object" &&
        "appRegistry" in registryModule.default &&
        Array.isArray(registryModule.default.appRegistry)
      ? registryModule.default.appRegistry
      : [];

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
