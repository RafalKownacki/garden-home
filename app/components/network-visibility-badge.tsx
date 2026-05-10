"use client";

import { useState } from "react";
import { apiPut } from "@/src/lib/api";
import type { AppNetworkVisibilityMode } from "@/src/types/api";

const VISIBILITY_PRESENTATION: Record<
  AppNetworkVisibilityMode,
  { label: string; icon: string; className: string }
> = {
  unknown: {
    label: "Nieustalone",
    icon: "❓",
    className: "bg-surface-strong text-muted",
  },
  "whitelist-lan": {
    label: "Whitelist LAN",
    icon: "🔒",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  lan: {
    label: "LAN",
    icon: "🏠",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  internet: {
    label: "Internet",
    icon: "🌐",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
};

const VISIBILITY_OPTIONS: AppNetworkVisibilityMode[] = [
  "unknown",
  "whitelist-lan",
  "lan",
  "internet",
];

export function NetworkVisibilityBadge({
  appId,
  mode,
  editable,
  token,
  onChange,
}: {
  appId: string;
  mode: AppNetworkVisibilityMode;
  editable: boolean;
  token?: string | null;
  onChange?: (appId: string, mode: AppNetworkVisibilityMode) => void;
}) {
  const presentation = VISIBILITY_PRESENTATION[mode];
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<AppNetworkVisibilityMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const badgeClass = `inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${presentation.className}`;

  if (!editable) {
    return (
      <span className={badgeClass} title={`Widoczność sieciowa: ${presentation.label}`}>
        <span aria-hidden="true">{presentation.icon}</span>
        {presentation.label}
      </span>
    );
  }

  const handleSelect = async (next: AppNetworkVisibilityMode) => {
    if (next === mode) {
      setOpen(false);
      return;
    }
    setSaving(next);
    setError(null);
    try {
      await apiPut(
        `/v1/admin/registry/${encodeURIComponent(appId)}/network-visibility`,
        { mode: next },
        token
      );
      onChange?.(appId, next);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={`${badgeClass} cursor-pointer transition hover:opacity-80`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Zmień widoczność sieciową"
      >
        <span aria-hidden="true">{presentation.icon}</span>
        {presentation.label}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface-strong p-2 text-left shadow-lg"
          >
            <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Widoczność sieciowa
            </div>
            <ul className="space-y-0.5">
              {VISIBILITY_OPTIONS.map((option) => {
                const presentationItem = VISIBILITY_PRESENTATION[option];
                const isActive = option === mode;
                const isSaving = saving === option;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      disabled={saving !== null}
                      onClick={() => void handleSelect(option)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-surface ${isActive ? "bg-surface" : ""} ${saving !== null && !isSaving ? "opacity-60" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true">{presentationItem.icon}</span>
                        <span>{presentationItem.label}</span>
                      </span>
                      {isActive && <span className="text-[10px] text-muted">●</span>}
                      {isSaving && <span className="text-[10px] text-muted">…</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {error && (
              <p className="mt-2 px-2 text-[11px] text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
