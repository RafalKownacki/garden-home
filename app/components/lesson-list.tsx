"use client";

import type { LessonSummary } from "@/src/types/api";

type Props = {
  lessons: LessonSummary[];
  selectedId: string | null;
  onSelect: (lesson: LessonSummary) => void;
};

export function LessonList({ lessons, selectedId, onSelect }: Props) {
  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-xs text-muted">
        Brak lekcji w wybranym filtrze.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {lessons.map((lesson) => {
        const isSelected = lesson.id === selectedId;
        return (
          <li key={lesson.id}>
            <button
              type="button"
              onClick={() => onSelect(lesson)}
              className={`group flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition ${
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-border bg-surface hover:border-accent/40 hover:bg-surface-strong"
              }`}
            >
              <span
                className={`text-sm font-medium leading-snug ${
                  isSelected ? "text-foreground" : "text-foreground"
                }`}
              >
                {lesson.title}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="font-semibold uppercase tracking-wider">
                  {lesson.appName ?? lesson.appId}
                </span>
                <span aria-hidden="true">·</span>
                <span>#{lesson.order}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
