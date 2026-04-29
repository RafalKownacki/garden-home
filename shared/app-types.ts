export type AppAccessRule =
  | { source: "realm"; anyRoles: string[] }
  | { source: "client"; clientId: string; anyRoles: string[] }
  | { source: "authenticated" };

export type AccessSnapshotSubjectMode = "explicit_users" | "all_authenticated";

export type AppAccessSyncConfig = {
  mode: "pull_snapshot_v1";
  url: string;
};

export type AppManifest = {
  id: string;
  name: string;
  description: string;
  url: string;
  environment: "prod";
  category?: string;
  // Legacy fallback during migration: apps without accessSync still use
  // the old role-based evaluation until they expose effective-access snapshots.
  access?: AppAccessRule[];
  accessSync?: AppAccessSyncConfig;
};

export type AppRegistrationRecord = AppManifest & {
  lastRegisteredAt?: string;
};

export type AppRegistryOverride = {
  id: string;
  sourcePath?: string;
  enabled?: boolean;
  visibleInHome?: boolean;
};

export type AppRegistryEntry = AppRegistrationRecord & {
  sourcePath?: string;
  enabled: boolean;
  visibleInHome: boolean;
};

export type AppNetworkVisibilityMode =
  | "unknown"
  | "whitelist-lan"
  | "lan"
  | "internet";

export type HomeAppCard = {
  id: string;
  name: string;
  description: string;
  url: string;
  category?: string;
  uptimeStatus?: "up" | "down" | "unknown";
  networkVisibility: AppNetworkVisibilityMode;
};

export type UserAccessProfile = {
  userId: string;
  username: string;
  displayName: string | null;
  principalType: "human" | "service";
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
};

export type ScanConfidence = "low" | "medium" | "high";

export type ScannedAppCandidate = {
  sourcePath: string;
  inferredId: string;
  inferredName: string;
  inferredUrl?: string;
  inferredClientIds: string[];
  inferredRoles: string[];
  matchedRegistryId?: string;
  isPublished: boolean;
  confidence: ScanConfidence;
  notes: string[];
};
