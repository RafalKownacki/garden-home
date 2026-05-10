"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  countAccess,
  Initials,
  MatrixAccessDetail,
  RoleBadge,
} from "@/components/matrix-access-detail";
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
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const isAdmin = profile?.realmRoles.includes("admin") ?? false;

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet<MatrixResponse>("/v1/admin/matrix?includeService=1", token);
        if (!cancelled) setMatrix(data);
      } catch {
        if (!cancelled) setError("Nie udało się pobrać danych.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isReady, isAuthenticated, token, isAdmin, router]);

  const filteredRows = useMemo(() => {
    if (!matrix) return [];
    let rows = matrix.rows;
    if (!showService) rows = rows.filter((r) => !r.isService);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.username.toLowerCase().includes(q) ||
          (r.displayName?.toLowerCase().includes(q) ?? false)
      );
    }
    return rows;
  }, [matrix, showService, search]);

  const selectedRow = useMemo(
    () => filteredRows.find((r) => r.userId === selectedUserId) ?? null,
    [filteredRows, selectedUserId]
  );

  // Auto-select first user if nothing is selected or selected user is filtered out
  useEffect(() => {
    if (!selectedRow && filteredRows.length > 0) {
      setSelectedUserId(filteredRows[0].userId);
    }
  }, [filteredRows, selectedRow]);

  function selectUser(userId: string) {
    setSelectedUserId(userId);
    setMobileDetailOpen(true);
  }

  if (!isReady || !isAuthenticated) return null;

  return (
    <main className="ambient-bg min-h-screen px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/80 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-white">
              U
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">Użytkownicy i dostępy</h1>
              <p className="text-xs text-muted leading-tight">Kto ma dostęp do czego</p>
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

        {/* Loading */}
        {loading && (
          <div className="animate-card-in rounded-2xl border border-border bg-surface p-8">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="animate-card-in rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Main content */}
        {matrix && (
          <div className="animate-card-in flex gap-5 min-h-[calc(100vh-180px)]">
            {/* Left panel — user list */}
            <div
              className={`flex w-full flex-col rounded-2xl border border-border bg-surface/80 backdrop-blur-sm md:w-80 md:shrink-0 ${
                mobileDetailOpen ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Search & filters */}
              <div className="border-b border-border px-4 py-3">
                <input
                  type="text"
                  placeholder="Szukaj użytkownika…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none transition focus:border-accent"
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={showService}
                    onChange={(e) => setShowService(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-accent"
                  />
                  Pokaż konta serwisowe
                </label>
              </div>

              {/* Count */}
              <div className="border-b border-border-subtle px-4 py-2">
                <p className="text-xs text-muted">
                  {filteredRows.length} użytkownik{filteredRows.length === 1 ? "" : filteredRows.length < 5 ? "y" : "ów"}
                </p>
              </div>

              {/* User list */}
              <div className="flex-1 overflow-y-auto">
                {filteredRows.map((row) => {
                  const { has, total } = countAccess(row, matrix.apps);
                  const isSelected = row.userId === selectedUserId;
                  return (
                    <button
                      key={row.userId}
                      type="button"
                      onClick={() => selectUser(row.userId)}
                      className={`flex w-full items-center gap-3 border-b border-border-subtle px-4 py-2.5 text-left transition hover:bg-surface-hover ${
                        isSelected ? "bg-accent/5 border-l-2 border-l-accent" : ""
                      } ${row.isService ? "opacity-50" : ""}`}
                    >
                      <Initials name={row.displayName || row.username} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {row.displayName || row.username}
                        </p>
                        {row.displayName && (
                          <p className="truncate text-xs text-muted">{row.username}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <RoleBadge row={row} />
                        <span className="text-[10px] tabular-nums text-muted">
                          {has}/{total}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filteredRows.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-muted">
                    Brak wyników.
                  </div>
                )}
              </div>
            </div>

            {/* Right panel — detail */}
            <div
              className={`flex-1 rounded-2xl border border-border bg-surface/80 p-6 backdrop-blur-sm ${
                mobileDetailOpen ? "flex flex-col" : "hidden md:flex md:flex-col"
              }`}
            >
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="mb-4 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent md:hidden"
              >
                ← Lista
              </button>

              {selectedRow ? (
                <MatrixAccessDetail row={selectedRow} apps={matrix.apps} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted">
                  Wybierz użytkownika z listy
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
