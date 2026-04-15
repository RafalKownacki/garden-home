"use client";

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/src/auth/use-auth";
import { apiGet } from "@/src/lib/api";
import type { AppAccessResponse, HomeAppCard } from "@/src/types/api";

const APP_THEMES: Record<string, { icon: string; gradient: string; accent: string }> = {
  // Kadry
  employee:              { icon: "👥", gradient: "from-blue-500/10 to-blue-600/5",      accent: "bg-blue-500" },
  "lista-plac":          { icon: "💵", gradient: "from-blue-400/10 to-blue-500/5",      accent: "bg-blue-400" },
  "personnel-notes":     { icon: "📋", gradient: "from-violet-500/10 to-violet-600/5",  accent: "bg-violet-500" },
  rekrutacja:            { icon: "🎯", gradient: "from-indigo-500/10 to-indigo-600/5",  accent: "bg-indigo-500" },
  // Rezerwacje
  "system-rezerwacji":   { icon: "📅", gradient: "from-emerald-500/10 to-emerald-600/5", accent: "bg-emerald-500" },
  "rezerwacje-oaza":     { icon: "🌴", gradient: "from-teal-500/10 to-teal-600/5",      accent: "bg-teal-500" },
  "rezerwacje-restauracja": { icon: "🍽️", gradient: "from-teal-400/10 to-teal-500/5",  accent: "bg-teal-400" },
  "pos-hotelapp":        { icon: "🏨", gradient: "from-cyan-500/10 to-cyan-600/5",      accent: "bg-cyan-500" },
  // Restauracja
  "rozliczenie-dnia":    { icon: "💰", gradient: "from-amber-500/10 to-amber-600/5",    accent: "bg-amber-500" },
  "rozliczenie-dnia-oaza": { icon: "💰", gradient: "from-amber-400/10 to-amber-500/5",  accent: "bg-amber-400" },
  "strefa-kelnera":      { icon: "🤵", gradient: "from-orange-500/10 to-orange-600/5",  accent: "bg-orange-500" },
  recipebook:            { icon: "📖", gradient: "from-lime-500/10 to-lime-600/5",      accent: "bg-lime-600" },
  magazyn:               { icon: "📦", gradient: "from-stone-500/10 to-stone-600/5",    accent: "bg-stone-500" },
  zakupy:                { icon: "🛒", gradient: "from-green-500/10 to-green-600/5",    accent: "bg-green-500" },
  "haccp-panel":         { icon: "🔬", gradient: "from-red-500/10 to-red-600/5",        accent: "bg-red-500" },
  // Finanse
  fincost:               { icon: "📊", gradient: "from-yellow-500/10 to-yellow-600/5",  accent: "bg-yellow-500" },
  przelewy:              { icon: "🏦", gradient: "from-sky-500/10 to-sky-600/5",        accent: "bg-sky-500" },
  ksef:                  { icon: "🧾", gradient: "from-slate-500/10 to-slate-600/5",    accent: "bg-slate-500" },
  // Narzędzia
  grello:                { icon: "📌", gradient: "from-rose-500/10 to-rose-600/5",      accent: "bg-rose-500" },
  marketingowiec:        { icon: "📣", gradient: "from-pink-500/10 to-pink-600/5",      accent: "bg-pink-500" },
  assets:                { icon: "🗄️", gradient: "from-gray-500/10 to-gray-600/5",     accent: "bg-gray-500" },
  chat:                  { icon: "💬", gradient: "from-purple-500/10 to-purple-600/5",   accent: "bg-purple-500" },
  // Infrastruktura
  metersapp:             { icon: "⚡", gradient: "from-yellow-400/10 to-yellow-500/5",   accent: "bg-yellow-400" },
  "tereny-zielone":      { icon: "🌿", gradient: "from-emerald-400/10 to-emerald-500/5", accent: "bg-emerald-400" },
};

const DEFAULT_THEME = { icon: "📦", gradient: "from-stone-500/10 to-stone-600/5", accent: "bg-stone-500" };

type AppCardProps = {
  app: HomeAppCard;
  index: number;
};

export function AppCard({ app, index }: AppCardProps) {
  const theme = APP_THEMES[app.id] ?? DEFAULT_THEME;
  const isDown = app.uptimeStatus === "down";

  const { profile, token } = useAuth();
  const isSuperadmin = profile?.realmRoles.includes("superadmin") ?? false;

  return (
    <article
      className={`card-glow animate-card-in group relative z-0 flex flex-col justify-between overflow-visible rounded-2xl border border-border bg-surface p-5 transition-[z-index] hover:z-20 focus-within:z-20 ${isDown ? "opacity-60 grayscale" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Accent top bar */}
      <div className={`absolute inset-x-0 top-0 h-1 ${isDown ? "bg-red-500" : theme.accent} opacity-60 transition-opacity group-hover:opacity-100`} />

      {/* Subtle gradient background */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl" role="img" aria-hidden="true">{theme.icon}</span>
          <div className="flex items-center gap-1.5">
            {isDown && (
              <span
                className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700 dark:bg-red-900/30 dark:text-red-400"
                title="Aplikacja niedostępna — ostatni healthcheck zakończył się niepowodzeniem"
              >
                ● Niedostępna
              </span>
            )}
            {app.category && (
              <span className="rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                {app.category}
              </span>
            )}
            {isSuperadmin ? <AccessPeek appId={app.id} appName={app.name} token={token} /> : null}
          </div>
        </div>
        <h2 className="text-lg font-semibold text-foreground">{app.name}</h2>
        <p className="text-sm leading-relaxed text-muted">{app.description}</p>
      </div>

      <div className="relative mt-5">
        <a
          href={app.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-80"
        >
          Otwórz
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="opacity-60">
            <path d="M6 3h7v7M13 3L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </article>
  );
}

type AccessPeekState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AppAccessResponse };

function AccessPeek({ appId, appName, token }: { appId: string; appName: string; token?: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AccessPeekState>({ status: "idle" });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 150);
  }, [cancelClose]);

  const handleOpen = useCallback(() => {
    cancelClose();
    setOpen(true);
    setState((current) => {
      if (current.status === "ready" || current.status === "loading") return current;
      void (async () => {
        setState({ status: "loading" });
        try {
          const data = await apiGet<AppAccessResponse>(
            `/v1/apps/${encodeURIComponent(appId)}/access`,
            token
          );
          setState({ status: "ready", data });
        } catch (error) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Nieznany błąd",
          });
        }
      })();
      return current;
    });
  }, [appId, cancelClose, token]);

  return (
    <div
      className="relative"
      onMouseEnter={handleOpen}
      onMouseLeave={scheduleClose}
      onFocus={handleOpen}
      onBlur={scheduleClose}
    >
      <button
        type="button"
        aria-label={`Pokaż użytkowników z dostępem do ${appName}`}
        className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-strong text-muted transition hover:text-foreground"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M2 13c.6-2.1 2.2-3.2 4-3.2s3.4 1.1 4 3.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="11.5" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M10 13c.3-1.5 1.2-2.4 2.5-2.4s2.2.9 2.5 2.4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface-strong p-3 text-left shadow-lg"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Dostęp — {appName}
            </span>
            {state.status === "ready" && (
              <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                {state.data.source === "snapshot" ? "snapshot" : "legacy"}
              </span>
            )}
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto">
            {state.status === "loading" && (
              <p className="py-3 text-center text-xs text-muted">Ładowanie…</p>
            )}
            {state.status === "error" && (
              <p className="py-3 text-center text-xs text-red-600 dark:text-red-400">
                Nie udało się załadować dostępów
              </p>
            )}
            {state.status === "ready" && state.data.users.length === 0 && (
              <p className="py-3 text-center text-xs text-muted">Brak użytkowników z dostępem</p>
            )}
            {state.status === "ready" && state.data.users.length > 0 && (
              <ul className="space-y-1.5">
                {state.data.users.map((user) => (
                  <li key={user.userId} className="text-xs leading-tight">
                    <div className="font-medium text-foreground">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-muted">{user.email ?? user.username}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.status === "ready" && (
            <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted">
              {state.data.count}{" "}
              {state.data.count === 1
                ? "użytkownik"
                : state.data.count > 1 && state.data.count < 5
                  ? "użytkowników"
                  : "użytkowników"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
