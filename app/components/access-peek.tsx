"use client";

import { useCallback, useRef, useState } from "react";
import { apiGet } from "@/src/lib/api";
import type { AppAccessResponse } from "@/src/types/api";

type AccessPeekState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AppAccessResponse };

export function AccessPeek({
  appId,
  appName,
  token,
}: {
  appId: string;
  appName: string;
  token?: string | null;
}) {
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
