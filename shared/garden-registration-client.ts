import type { AppManifest } from "./app-types.js";

export type RegistrationClientOptions = {
  apiUrl?: string;
  registrationKey?: string;
  retries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, "log" | "warn" | "error">;
};

export type RegistrationResult =
  | { ok: true; created: boolean; lastRegisteredAt: string }
  | { ok: false; error: string };

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Registers a satellite app with garden-home. Non-throwing by design:
 * if garden-home is unreachable, the caller app still boots. Errors are
 * logged and surfaced via the returned result object.
 */
export async function registerWithGardenHome(
  manifest: AppManifest,
  options: RegistrationClientOptions = {}
): Promise<RegistrationResult> {
  const apiUrl = options.apiUrl ?? process.env.GARDEN_API_URL ?? "";
  const key = options.registrationKey ?? process.env.GARDEN_REGISTRY_KEY ?? "";
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const log = options.logger ?? console;
  const doFetch = options.fetchImpl ?? fetch;

  if (!apiUrl) {
    log.warn("[garden-registration] GARDEN_API_URL not set — skipping registration");
    return { ok: false, error: "MISSING_API_URL" };
  }
  if (!key) {
    log.warn("[garden-registration] GARDEN_REGISTRY_KEY not set — skipping registration");
    return { ok: false, error: "MISSING_REGISTRATION_KEY" };
  }

  const endpoint = `${apiUrl.replace(/\/$/, "")}/v1/registry/register`;
  const body = JSON.stringify(manifest);

  let lastError = "UNKNOWN";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await doFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body,
      });
      if (res.ok) {
        const payload = (await res.json()) as {
          created: boolean;
          lastRegisteredAt: string;
        };
        log.log(
          `[garden-registration] Registered "${manifest.id}" (${payload.created ? "created" : "updated"})`
        );
        return { ok: true, created: payload.created, lastRegisteredAt: payload.lastRegisteredAt };
      }
      lastError = `HTTP_${res.status}`;
      log.warn(
        `[garden-registration] Attempt ${attempt}/${retries} failed for "${manifest.id}": ${lastError}`
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      log.warn(
        `[garden-registration] Attempt ${attempt}/${retries} failed for "${manifest.id}": ${lastError}`
      );
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
    }
  }

  log.error(`[garden-registration] Gave up registering "${manifest.id}": ${lastError}`);
  return { ok: false, error: lastError };
}
