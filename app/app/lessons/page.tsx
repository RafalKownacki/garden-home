"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { LessonList } from "@/components/lesson-list";
import { LessonViewer } from "@/components/lesson-viewer";
import { useAuth } from "@/src/auth/use-auth";
import { apiGet } from "@/src/lib/api";
import { appConfig } from "@/src/lib/config";
import type {
  LessonDetail,
  LessonSummary,
  LessonsListResponse,
} from "@/src/types/api";

const FILTER_ALL = "__all__";
const FILTER_GLOBAL = "all";

type FilterValue = typeof FILTER_ALL | string;

function lessonIdToPath(id: string): string {
  return id;
}

function LessonsPageInner() {
  const { isReady, isAuthenticated, token, profile, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryAppId = searchParams.get("app");
  const queryLessonId = searchParams.get("lesson");

  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterValue>(FILTER_ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      window.location.replace("/login");
      return;
    }
    let cancelled = false;
    const load = async () => {
      setListLoading(true);
      setListError(null);
      try {
        const data = await apiGet<LessonsListResponse>("/v1/lessons", token);
        if (!cancelled) setLessons(data.lessons);
      } catch (err) {
        if (!cancelled)
          setListError(err instanceof Error ? err.message : "Nie udało się pobrać lekcji.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, token]);

  // Inicjalizacja stanu z query string (?app=, ?lesson=)
  useEffect(() => {
    if (lessons.length === 0) return;

    if (queryLessonId) {
      const found = lessons.find((l) => l.id === queryLessonId);
      if (found) {
        setSelectedId(found.id);
        setFilter(found.appId);
        return;
      }
    }
    if (queryAppId) {
      const matching = lessons.filter((l) => l.appId === queryAppId);
      if (matching.length > 0) {
        setFilter(queryAppId);
        setSelectedId((current) => current ?? matching[0]?.id ?? null);
        return;
      }
    }
    if (!selectedId) {
      setSelectedId(lessons[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, queryAppId, queryLessonId]);

  // Pobierz treść wybranej lekcji
  useEffect(() => {
    if (!selectedId || !token) {
      setDetail(null);
      return;
    }
    const lesson = lessons.find((l) => l.id === selectedId);
    if (!lesson) return;

    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const data = await apiGet<LessonDetail>(
          `/v1/lessons/${encodeURIComponent(lesson.appId)}/${encodeURIComponent(
            lesson.id.split("/").slice(1).join("/")
          )}`,
          token
        );
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled)
          setDetailError(err instanceof Error ? err.message : "Nie udało się pobrać treści lekcji.");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedId, lessons, token]);

  const visibleLessons = useMemo(() => {
    if (filter === FILTER_ALL) return lessons;
    return lessons.filter((l) => l.appId === filter);
  }, [filter, lessons]);

  const filterChips = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; count: number }>();
    seen.set(FILTER_ALL, { id: FILTER_ALL, label: "Wszystkie", count: lessons.length });
    for (const lesson of lessons) {
      const id = lesson.appId;
      const label =
        id === FILTER_GLOBAL ? "Globalne" : lesson.appName ?? id;
      const existing = seen.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        seen.set(id, { id, label, count: 1 });
      }
    }
    return Array.from(seen.values());
  }, [lessons]);

  function handleSelect(lesson: LessonSummary) {
    setSelectedId(lesson.id);
    setMobileDetailOpen(true);
    const params = new URLSearchParams();
    params.set("lesson", lessonIdToPath(lesson.id));
    router.replace(`/lessons?${params.toString()}`, { scroll: false });
  }

  function handleFilter(next: FilterValue) {
    setFilter(next);
    if (next !== FILTER_ALL) {
      const first = lessons.find((l) => l.appId === next);
      if (first) setSelectedId(first.id);
    }
  }

  if (!isReady || !isAuthenticated) return null;

  return (
    <main className="ambient-bg min-h-screen px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <Topbar appName={appConfig.appName} profile={profile} onLogout={logout} />

        <section className="px-1">
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-foreground sm:text-3xl">
            Pomoc
          </h2>
          <p className="mt-1 text-sm text-muted">
            Krótkie lekcje jak korzystać z portalu i poszczególnych aplikacji.
          </p>
        </section>

        {/* Chip filter */}
        {!listLoading && !listError && lessons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filterChips.map((chip) => {
              const isActive = chip.id === filter;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleFilter(chip.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isActive
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className="rounded bg-surface-strong px-1.5 text-[10px] tabular-nums text-muted">
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {listLoading && (
          <div className="rounded-2xl border border-border bg-surface p-8">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          </div>
        )}

        {listError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {listError}
          </div>
        )}

        {!listLoading && !listError && lessons.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-6 py-8 text-center text-sm text-muted">
            Brak lekcji. Dodaj plik <code className="rounded bg-surface-strong px-1.5 py-0.5">.md</code> do
            katalogu <code className="rounded bg-surface-strong px-1.5 py-0.5">shared/lessons/</code>.
          </div>
        )}

        {!listLoading && !listError && lessons.length > 0 && (
          <div className="flex gap-5 min-h-[calc(100vh-260px)]">
            {/* Left panel — lista */}
            <div
              className={`flex w-full flex-col gap-2 md:w-80 md:shrink-0 ${
                mobileDetailOpen ? "hidden md:flex" : "flex"
              }`}
            >
              <LessonList
                lessons={visibleLessons}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            </div>

            {/* Right panel — viewer */}
            <div
              className={`flex-1 ${
                mobileDetailOpen ? "flex flex-col" : "hidden md:flex md:flex-col"
              }`}
            >
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="mb-3 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent md:hidden"
              >
                ← Lista
              </button>

              {detailLoading && (
                <div className="rounded-2xl border border-border bg-surface p-8">
                  <div className="space-y-3">
                    <div className="skeleton h-6 w-2/3" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-32 w-full" />
                  </div>
                </div>
              )}
              {detailError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                  {detailError}
                </div>
              )}
              {!detailLoading && !detailError && detail && <LessonViewer lesson={detail} />}
              {!detailLoading && !detailError && !detail && (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-border bg-surface text-sm text-muted">
                  Wybierz lekcję z listy
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LessonsPage() {
  return (
    <Suspense fallback={null}>
      <LessonsPageInner />
    </Suspense>
  );
}
