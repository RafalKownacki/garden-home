"use client";

import Link from "next/link";
import { useAuth } from "@/src/auth/use-auth";
import type { AppNetworkVisibilityMode, HomeAppCard } from "@/src/types/api";
import { AccessPeek } from "./access-peek";
import { APP_THEMES, DEFAULT_THEME } from "./app-card-themes";
import { NetworkVisibilityBadge } from "./network-visibility-badge";

type AppCardProps = {
  app: HomeAppCard;
  index: number;
  onVisibilityChange?: (appId: string, mode: AppNetworkVisibilityMode) => void;
};

export function AppCard({ app, index, onVisibilityChange }: AppCardProps) {
  const theme = APP_THEMES[app.id] ?? DEFAULT_THEME;
  const isDown = app.uptimeStatus === "down";
  const { profile, token } = useAuth();
  const isSuperadmin = profile?.realmRoles.includes("superadmin") ?? false;
  const isAdmin = profile?.realmRoles.includes("admin") ?? false;

  return (
    <article
      className={`card-glow animate-card-in group relative z-0 flex flex-col justify-between overflow-visible rounded-2xl border border-border bg-surface p-5 transition-[z-index] hover:z-20 focus-within:z-20 ${isDown ? "opacity-60 grayscale" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${isDown ? "bg-red-500" : theme.accent} opacity-60 transition-opacity group-hover:opacity-100`} />
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
            <NetworkVisibilityBadge
              appId={app.id}
              mode={app.networkVisibility}
              editable={isAdmin}
              token={token}
              onChange={onVisibilityChange}
            />
            {app.lessonCount && app.lessonCount > 0 ? (
              <LessonHint appId={app.id} appName={app.name} count={app.lessonCount} />
            ) : null}
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

function LessonHint({ appId, appName, count }: { appId: string; appName: string; count: number }) {
  return (
    <Link
      href={`/lessons?app=${encodeURIComponent(appId)}`}
      aria-label={`Pomoc — ${count} ${count === 1 ? "lekcja" : count < 5 ? "lekcje" : "lekcji"} o ${appName}`}
      title={`${count} ${count === 1 ? "lekcja" : count < 5 ? "lekcje" : "lekcji"} jak korzystać z ${appName}`}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-surface-strong px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted transition hover:border-accent hover:text-accent"
    >
      <span aria-hidden="true">?</span>
      <span>{count}</span>
    </Link>
  );
}
