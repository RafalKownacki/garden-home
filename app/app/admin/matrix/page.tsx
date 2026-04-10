"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/auth/use-auth";
import { apiGet } from "@/src/lib/api";
import type { MatrixResponse } from "@/src/types/api";

export default function MatrixPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, token, profile } = useAuth();
  const [matrix, setMatrix] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showService, setShowService] = useState(false);

  const isAdmin = profile?.realmRoles.includes("admin") ?? false;

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !token) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const qs = showService ? "?includeService=1" : "";
        const data = await apiGet<MatrixResponse>(`/v1/admin/matrix${qs}`, token);
        if (!cancelled) setMatrix(data);
      } catch {
        if (!cancelled) setError("Nie udało się pobrać macierzy.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isReady, isAuthenticated, token, isAdmin, router, showService]);

  if (!isReady || !isAuthenticated) return null;

  return (
    <main className="ambient-bg min-h-screen px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/80 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-white">
              M
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">Macierz dostępów</h1>
              <p className="text-xs text-muted leading-tight">Panel administracyjny</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
          >
            ← Powrót
          </button>
        </header>

        {/* Filter bar */}
        {matrix && (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/80 px-5 py-3 backdrop-blur-sm">
            <p className="text-sm text-muted">
              {matrix.rows.length} użytkowników
              {matrix.hiddenServiceAccounts > 0 && !showService && (
                <span className="ml-1 text-muted/60">
                  ({matrix.hiddenServiceAccounts} kont serwisowych ukrytych)
                </span>
              )}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={showService}
                onChange={(e) => setShowService(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-accent"
              />
              Pokaż konta serwisowe
            </label>
          </div>
        )}

        {loading && (
          <div className="animate-card-in rounded-2xl border border-border bg-surface p-8">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="animate-card-in rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {matrix && (
          <div className="animate-card-in overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
                    Użytkownik
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
                    Typ
                  </th>
                  {matrix.apps.map((app) => (
                    <th key={app.id} className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
                      {app.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row, i) => (
                  <tr
                    key={row.userId}
                    className={`border-b border-border-subtle transition hover:bg-surface-hover ${i % 2 === 0 ? "" : "bg-surface-strong/50"} ${row.isService ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-medium text-foreground">{row.displayName || row.username}</p>
                      {row.displayName && (
                        <p className="text-xs text-muted">{row.username}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.isService ? (
                        <span className="rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-muted">
                          Serwis
                        </span>
                      ) : row.isAdmin ? (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Admin
                        </span>
                      ) : (
                        <span className="rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-muted">
                          User
                        </span>
                      )}
                    </td>
                    {matrix.apps.map((app) => (
                      <td key={app.id} className="px-4 py-3 text-center">
                        {row.access[app.id] ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" title="Ma dostęp">
                            ✓
                          </span>
                        ) : (
                          <span className="text-border" title="Brak dostępu">–</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
