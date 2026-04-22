export type JwtClaims = {
  sub?: string;
  preferred_username?: string;
  name?: string;
  principal_type?: string;
  grdn_principal_type?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  aud?: string | string[];
  azp?: string;
};
