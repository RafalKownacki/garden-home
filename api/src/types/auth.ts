export type JwtClaims = {
  sub?: string;
  preferred_username?: string;
  name?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  aud?: string | string[];
  azp?: string;
};
