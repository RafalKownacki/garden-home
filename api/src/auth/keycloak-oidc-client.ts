import crypto from "node:crypto";
import { config } from "../config.js";

export type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  error?: string;
};

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createCodeVerifier(): string {
  return toBase64Url(crypto.randomBytes(48));
}

export function createCodeChallenge(verifier: string): string {
  return toBase64Url(crypto.createHash("sha256").update(verifier).digest());
}

export function createAuthEndpoint(): string {
  return `${config.keycloakIssuer.replace(/\/$/, "")}/protocol/openid-connect/auth`;
}

function createTokenEndpoint(): string {
  return `${config.keycloakIssuer.replace(/\/$/, "")}/protocol/openid-connect/token`;
}

export async function performTokenRequest(params: URLSearchParams): Promise<TokenResponse> {
  params.set("client_id", config.keycloakClientId);
  if (config.keycloakClientSecret) {
    params.set("client_secret", config.keycloakClientSecret);
  }

  const response = await fetch(createTokenEndpoint(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(payload.error || `token_exchange_failed:${response.status}`);
  }

  return payload;
}
