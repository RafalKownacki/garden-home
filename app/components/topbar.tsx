"use client";

import Link from "next/link";
import type { MeResponse } from "../src/types/auth";

type TopbarProps = {
  appName: string;
  profile: MeResponse | null;
  onLogout: () => void | Promise<void>;
};

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
      {initials || "?"}
    </div>
  );
}

export function Topbar({ appName, profile, onLogout }: TopbarProps) {
  const displayName = profile?.displayName || profile?.username || "Użytkownik";
  const isAdmin = profile?.realmRoles.includes("admin") ?? false;

  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/80 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          G
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground leading-tight">{appName}</h1>
          <p className="text-xs text-muted leading-tight">Portal aplikacji</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/status"
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
        >
          Status
        </Link>
        {isAdmin && (
          <Link
            href="/admin/matrix"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
          >
            Macierz dostępów
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          <UserAvatar name={displayName} />
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground leading-tight">{displayName}</p>
            <p className="text-xs text-muted leading-tight">
              {isAdmin ? "Administrator" : "Użytkownik"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-red-300 hover:text-red-500 dark:hover:border-red-800 dark:hover:text-red-400"
          aria-label="Wyloguj"
        >
          Wyloguj
        </button>
      </div>
    </header>
  );
}
