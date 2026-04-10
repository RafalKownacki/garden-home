"use client";

import { useEffect, useState } from "react";
import { AppsGrid } from "@/components/apps-grid";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/src/auth/use-auth";
import { apiGet } from "@/src/lib/api";
import { appConfig } from "@/src/lib/config";
import type { AppsResponse } from "@/src/types/api";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Dobrej nocy";
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Miłego popołudnia";
  return "Dobry wieczór";
}

export default function HomePage() {
  const { isReady, isAuthenticated, token, profile, logout, login } = useAuth();
  const [appsResponse, setAppsResponse] = useState<AppsResponse>({ count: 0, apps: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !token) {
      window.location.replace("/login");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<AppsResponse>("/v1/apps", token);
        if (!cancelled) setAppsResponse(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się pobrać aplikacji.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isAuthenticated, isReady, token]);

  /* ---- Not ready / not authenticated ---- */
  if (!isReady || !isAuthenticated || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-10 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">G</div>
          <h1 className="text-2xl font-semibold text-foreground">{appConfig.appName}</h1>
          <p className="mt-2 text-sm text-muted">Portal aplikacji Garden</p>
          <button
            type="button"
            onClick={() => void login()}
            className="mt-8 w-full rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-80"
          >
            Zaloguj się
          </button>
        </section>
      </main>
    );
  }

  /* ---- Authenticated ---- */
  const firstName = (profile?.displayName || profile?.username || "").split(/\s/)[0];

  return (
    <main className="ambient-bg min-h-screen px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <Topbar appName={appConfig.appName} profile={profile} onLogout={logout} />

        {/* Greeting + count */}
        <section className="px-1">
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-foreground sm:text-3xl">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? "Ładowanie aplikacji…"
              : error
                ? "Wystąpił problem z pobieraniem aplikacji"
                : `${appsResponse.count} ${appsResponse.count === 1 ? "aplikacja dostępna" : appsResponse.count < 5 ? "aplikacje dostępne" : "aplikacji dostępnych"}`}
          </p>
        </section>

        {/* Content */}
        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <section className="animate-card-in rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 text-sm font-medium text-red-600 underline underline-offset-2 hover:text-red-500 dark:text-red-400"
            >
              Spróbuj ponownie
            </button>
          </section>
        ) : appsResponse.apps.length > 0 ? (
          <AppsGrid apps={appsResponse.apps} />
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}
