export type MeResponse = {
  userId: string;
  username: string;
  displayName: string | null;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
};

export type AuthContextValue = {
  isEnabled: boolean;
  isReady: boolean;
  isAuthenticated: boolean;
  token: string | null;
  profile: MeResponse | null;
  login: (forcePrompt?: boolean) => Promise<void>;
  logout: () => Promise<void>;
};
