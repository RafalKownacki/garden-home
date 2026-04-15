import crypto from "node:crypto";

export const LOGIN_STATE_TTL_MS = 10 * 60 * 1000;

export type OidcLoginState = {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
};

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

function assertSecret(secret: string): string {
  if (!secret) {
    throw new Error("OIDC_STATE_SECRET_NOT_CONFIGURED");
  }
  return secret;
}

function createSignature(payload: string, secret: string): string {
  return toBase64Url(crypto.createHmac("sha256", secret).update(payload).digest());
}

export function encodeOidcLoginState(state: OidcLoginState, secret: string): string {
  const encodedPayload = toBase64Url(Buffer.from(JSON.stringify(state), "utf8"));
  const encodedSignature = createSignature(encodedPayload, assertSecret(secret));
  return `${encodedPayload}.${encodedSignature}`;
}

export function decodeOidcLoginState(params: {
  value: string;
  secret: string;
  expectedState: string;
  now?: number;
  maxAgeMs?: number;
}): OidcLoginState | null {
  const [encodedPayload, encodedSignature] = params.value.split(".");
  if (!encodedPayload || !encodedSignature) return null;

  const secret = assertSecret(params.secret);
  const expectedSignature = createSignature(encodedPayload, secret);
  const providedSignature = Buffer.from(encodedSignature, "utf8");
  const computedSignature = Buffer.from(expectedSignature, "utf8");
  if (
    providedSignature.length !== computedSignature.length ||
    !crypto.timingSafeEqual(providedSignature, computedSignature)
  ) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(encodedPayload).toString("utf8"));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<OidcLoginState>;
  if (
    typeof candidate.state !== "string" ||
    typeof candidate.codeVerifier !== "string" ||
    typeof candidate.redirectUri !== "string" ||
    typeof candidate.returnTo !== "string" ||
    typeof candidate.createdAt !== "number"
  ) {
    return null;
  }

  if (candidate.state !== params.expectedState) {
    return null;
  }

  const now = params.now ?? Date.now();
  const maxAgeMs = params.maxAgeMs ?? LOGIN_STATE_TTL_MS;
  if (candidate.createdAt > now || now - candidate.createdAt > maxAgeMs) {
    return null;
  }

  return candidate as OidcLoginState;
}
