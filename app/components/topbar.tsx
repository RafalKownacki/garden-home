"use client";

import Link from "next/link";
import type { MeResponse } from "../src/types/auth";

type TopbarProps = {
  appName: string;
  profile: MeResponse | null;
  onLogout: () => void | Promise<void>;
};

export function Topbar({ appName, profile, onLogout }: TopbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 rounded-[28px] border border-stone-200 bg-white/92 px-6 py-4 shadow-sm backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Garden</p>
        <h1 className="text-2xl font-semibold text-stone-900">{appName}</h1>
      </div>
      <div className="flex items-center gap-4">
        {profile?.realmRoles.includes("admin") && (
          <Link
            href="/admin/matrix"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Macierz dostępów
          </Link>
        )}
        <div className="text-right">
          <p className="text-sm font-medium text-stone-900">{profile?.displayName || profile?.username || "Użytkownik"}</p>
          <p className="text-xs text-stone-500">
            {profile ? (profile.realmRoles.includes("admin") ? "Admin" : "Użytkownik") : "Brak sesji"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
        >
          Wyloguj
        </button>
      </div>
    </header>
  );
}
