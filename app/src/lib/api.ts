import { appConfig } from "./config";

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()) as T;
}
