"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/auth/use-auth";
import { apiGet } from "@/src/lib/api";
import type {
  UptimeApp,
  UptimeBucketState,
  UptimeResponse,
  UptimeWindow
} from "@/src/types/api";

const WINDOW_LABELS: Record<UptimeWindow, string> = {
  "24h": "24 godziny",
  "7d": "7 dni",
  "30d": "30 dni"
};

const WINDOWS: UptimeWindow[] = ["24h", "7d", "30d"];

const BUCKET_COLORS: Record<UptimeBucketState, string> = {
  up: "bg-emerald-500",
  down: "bg-red-500",
  partial: "bg-amber-400",
  unknown: "bg-slate-300 dark:bg-slate-700"
};

function formatBucketTooltip(
  state: UptimeBucketState,
  startAt: number,
  bucketSizeMs: number,
  index: number
): string {
  const from = new Date(startAt + index * bucketSizeMs);
  const to = new Date(startAt + (index + 1) * bucketSizeMs);
  const fmt = (d: Date) =>
    d.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  const label =
    state === "up"
      ? "UP"
      : state === "down"
        ? "DOWN"
        : state === "partial"
          ? "częściowo"
          : "brak danych";
  return `${fmt(from)} – ${fmt(to)}: ${label}`;
}

function AppRow({
  app,
  startAt,
  bucketSizeMs
}: {
  app: UptimeApp;
  startAt: number;
  bucketSizeMs: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Link
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-semibold text-foreground hover:text-accent"
          >
            {app.name}
          </Link>
          <span className="truncate text-xs text-muted">{app.url}</span>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-semibold text-foreground">
            {app.uptimePct === null ? "—" : `${app.uptimePct.toFixed(1)}%`}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted">uptime</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-[2px]">
        {app.buckets.map((state, i) => (
          <span
            key={i}
            title={formatBucketTooltip(state, startAt, bucketSizeMs, i)}
            className={`h-5 w-[4px] rounded-sm ${BUCKET_COLORS[state]}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function StatusPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, token } = useAuth();
  const [window, setWindow] = useState<UptimeWindow>("24h");
  const [data, setData] = useState<UptimeResponse | null>(null);
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
        const res = await apiGet<UptimeResponse>(`/v1/uptime?window=${window}`, token);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Nie udało się pobrać statusu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, token, window, router]);

  const overallPct = useMemo(() => {
    if (!data) return null;
    const values = data.apps.map((a) => a.uptimePct).filter((v): v is number => v !== null);
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }, [data]);

  if (!isReady || !isAuthenticated) return null;

  return (
    <main className="ambient-bg min-h-screen px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/80 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
              S
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">Status aplikacji</h1>
              <p className="text-xs text-muted leading-tight">
                Sprawdzane co 5 minut · {overallPct === null ? "—" : `średnio ${overallPct}%`}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
          >
            ← Powrót
          </Link>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindow(w)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  window === w
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {WINDOW_LABELS[w]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> UP</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-400" /> częściowo</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-500" /> DOWN</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-slate-300 dark:bg-slate-700" /> brak danych</span>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-border bg-surface/60 p-8 text-center text-sm text-muted">
            Ładowanie statusu…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        ) : data ? (
          <div className="flex flex-col gap-3">
            {data.apps.map((app) => (
              <AppRow
                key={app.id}
                app={app}
                startAt={data.meta.startAt}
                bucketSizeMs={data.meta.bucketSizeMs}
              />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
