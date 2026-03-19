export type AppAccessRule = {
  source: "client" | "realm";
  clientId?: string;
  anyRoles: string[];
};

export type AppRegistryEntry = {
  id: string;
  name: string;
  description: string;
  url: string;
  environment: "prod";
  category?: string;
  sourcePath?: string;
  enabled: boolean;
  visibleInHome: boolean;
  access: AppAccessRule[];
};

export type HomeAppCard = {
  id: string;
  name: string;
  description: string;
  url: string;
  category?: string;
};

export type UserAccessProfile = {
  userId: string;
  username: string;
  displayName: string | null;
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
