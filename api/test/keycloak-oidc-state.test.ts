import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeOidcLoginState,
  encodeOidcLoginState,
} from "../src/auth/keycloak-oidc-state.js";

const SECRET = "test-oidc-secret";

test("OIDC login state round-trips with signature verification", () => {
  const encoded = encodeOidcLoginState(
    {
      state: "abc-123",
      codeVerifier: "verifier",
      redirectUri: "https://home.grdn.pl/api/v1/auth/callback",
      returnTo: "/admin/matrix",
      createdAt: Date.parse("2026-04-16T08:00:00.000Z"),
    },
    SECRET
  );

  const decoded = decodeOidcLoginState({
    value: encoded,
    secret: SECRET,
    expectedState: "abc-123",
    now: Date.parse("2026-04-16T08:05:00.000Z"),
  });

  assert.deepEqual(decoded, {
    state: "abc-123",
    codeVerifier: "verifier",
    redirectUri: "https://home.grdn.pl/api/v1/auth/callback",
    returnTo: "/admin/matrix",
    createdAt: Date.parse("2026-04-16T08:00:00.000Z"),
  });
});

test("OIDC login state rejects invalid signatures", () => {
  const encoded = encodeOidcLoginState(
    {
      state: "abc-123",
      codeVerifier: "verifier",
      redirectUri: "https://home.grdn.pl/api/v1/auth/callback",
      returnTo: "/",
      createdAt: Date.parse("2026-04-16T08:00:00.000Z"),
    },
    SECRET
  );

  const tampered = `${encoded.slice(0, -1)}${encoded.endsWith("a") ? "b" : "a"}`;
  const decoded = decodeOidcLoginState({
    value: tampered,
    secret: SECRET,
    expectedState: "abc-123",
    now: Date.parse("2026-04-16T08:01:00.000Z"),
  });

  assert.equal(decoded, null);
});

test("OIDC login state rejects expired payloads", () => {
  const encoded = encodeOidcLoginState(
    {
      state: "abc-123",
      codeVerifier: "verifier",
      redirectUri: "https://home.grdn.pl/api/v1/auth/callback",
      returnTo: "/",
      createdAt: Date.parse("2026-04-16T08:00:00.000Z"),
    },
    SECRET
  );

  const decoded = decodeOidcLoginState({
    value: encoded,
    secret: SECRET,
    expectedState: "abc-123",
    now: Date.parse("2026-04-16T08:15:01.000Z"),
  });

  assert.equal(decoded, null);
});
