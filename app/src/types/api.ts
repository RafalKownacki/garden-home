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

export type AppsResponse = {
  count: number;
  apps: HomeAppCard[];
};

export type MatrixApp = {
  id: string;
  name: string;
  category?: string;
  lastRegisteredAt?: string | null;
  isStale?: boolean;
  accessSyncStatus?:
    | "legacy"
    | "fresh"
    | "stale"
    | "failed"
    | "never_synced"
    | "not_configured";
  accessSyncFetchedAt?: number | null;
  accessSyncGeneratedAt?: string | null;
  accessSyncUserCount?: number | null;
  accessSyncError?: string | null;
};

export type MatrixRow = {
  userId: string;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  isService?: boolean;
  access: Record<string, boolean>;
};

export type MatrixResponse = {
  apps: MatrixApp[];
  rows: MatrixRow[];
  totalUsers: number;
  hiddenServiceAccounts: number;
};

export type AppAccessUser = {
  userId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  source: "snapshot" | "legacy";
};

export type AppAccessResponse = {
  appId: string;
  name: string;
  source: "snapshot" | "legacy";
  count: number;
  users: AppAccessUser[];
};

export type UptimeWindow = "24h" | "7d" | "30d";

export type UptimeBucketState = "up" | "down" | "partial" | "unknown";

export type UptimeApp = {
  id: string;
  name: string;
  url: string;
  category?: string;
  buckets: UptimeBucketState[];
  uptimePct: number | null;
};

export type UptimeResponse = {
  meta: {
    window: UptimeWindow;
    startAt: number;
    endAt: number;
    bucketSizeMs: number;
    bucketCount: number;
  };
  apps: UptimeApp[];
};
