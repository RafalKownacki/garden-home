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

  const isAdmin = profile?.realmRoles.includes("admin") ?? false;

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !token) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiGet<MatrixResponse>("/v1/admin/matrix", token);
        if (!cancelled) setMatrix(data);
      } catch {
        if (!cancelled) setError("Nie udało się pobrać macierzy.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isReady, isAuthenticated, token, isAdmin, router]);

  if (!isReady || !isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#f7f5f2_100%)] px-6 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4 rounded-[28px] border border-stone-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Garden Admin</p>
            <h1 className="text-2xl font-semibold text-stone-900">Macierz dostępów</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            ← Powrót
          </button>
        </header>

        {loading && (
          <div className="rounded-[28px] border border-stone-200 bg-white px-6 py-10 text-sm text-stone-500 shadow-sm">
            Ładowanie macierzy…
          </div>
        )}

        {error && (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-10 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {matrix && (
          <div className="overflow-x-auto rounded-[28px] border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="px-6 py-4 text-left font-semibold text-stone-700 whitespace-nowrap">Użytkownik</th>
                  <th className="px-4 py-4 text-left font-semibold text-stone-700 whitespace-nowrap">Rola</th>
                  {matrix.apps.map((app) => (
                    <th key={app.id} className="px-4 py-4 text-center font-semibold text-stone-700 whitespace-nowrap">
                      {app.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row, i) => (
                  <tr
                    key={row.userId}
                    className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <p className="font-medium text-stone-900">{row.displayName || row.username}</p>
                      <p className="text-xs text-stone-500">{row.username}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.isAdmin ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          Admin
                        </span>
                      ) : (
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                          Użytkownik
                        </span>
                      )}
                    </td>
                    {matrix.apps.map((app) => (
                      <td key={app.id} className="px-4 py-3 text-center">
                        {row.access[app.id] ? (
                          <span className="text-emerald-600 text-base" title="Ma dostęp">✓</span>
                        ) : (
                          <span className="text-stone-300 text-base" title="Brak dostępu">–</span>
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
