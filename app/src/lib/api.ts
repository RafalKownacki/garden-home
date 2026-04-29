import { appConfig } from "./config";

function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appConfig.apiBaseUrl}${normalizedPath}`;
}

function shouldIncludeCredentials(url: string): boolean {
  if (typeof window === "undefined") return url.startsWith("/");
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return url.startsWith("/");
  }
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  const url = resolveApiUrl(path);
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
    ...(shouldIncludeCredentials(url) ? { credentials: "include" as const } : {})
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  token?: string | null
): Promise<T> {
  const url = resolveApiUrl(path);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    ...(shouldIncludeCredentials(url) ? { credentials: "include" as const } : {})
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()) as T;
}
