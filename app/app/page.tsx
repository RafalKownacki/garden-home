"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppsGrid } from "@/components/apps-grid";
import { EmptyState } from "@/components/empty-state";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/src/auth/use-auth";
import { apiGet } from "@/src/lib/api";
import { appConfig } from "@/src/lib/config";
import type { AppsResponse } from "@/src/types/api";

export default function HomePage() {
  const router = useRouter();
  const { isReady, isAuthenticated, token, profile, logout } = useAuth();
  const [appsResponse, setAppsResponse] = useState<AppsResponse>({ count: 0, apps: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<AppsResponse>("/v1/apps", token);
        if (!cancelled) {
          setAppsResponse(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nie udało się pobrać aplikacji.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isReady, router, token]);

  if (!isReady || (!isAuthenticated && !error)) {
    return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-stone-500">Ładowanie Home…</main>;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f7f5f2_100%)] px-6 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Topbar appName={appConfig.appName} profile={profile} onLogout={logout} />
        <section className="rounded-[28px] border border-stone-200 bg-white/90 px-6 py-6 shadow-sm backdrop-blur">
          <p className="text-sm font-medium text-stone-500">Portal startowy</p>
          <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-stone-950">
            Masz dostęp do {appsResponse.count} aplikacji
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
            Home pokazuje tylko produkcyjne aplikacje przypisane do Twojego konta w realmie garden.
          </p>
        </section>
        {loading ? (
          <section className="rounded-[28px] border border-stone-200 bg-white px-6 py-10 text-sm text-stone-500 shadow-sm">
            Pobieranie aplikacji…
          </section>
        ) : error ? (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-10 text-sm text-rose-700 shadow-sm">
            {error}
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
