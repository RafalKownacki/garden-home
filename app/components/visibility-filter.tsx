"use client";

import type { AppNetworkVisibilityMode } from "@/src/types/api";

export type VisibilityFilterValue = AppNetworkVisibilityMode | "all";

const FILTER_OPTIONS: Array<{
  value: VisibilityFilterValue;
  label: string;
  icon: string;
}> = [
  { value: "all", label: "Wszystkie", icon: "✦" },
  { value: "unknown", label: "Nieustalone", icon: "❓" },
  { value: "whitelist-lan", label: "Whitelist LAN", icon: "🔒" },
  { value: "lan", label: "LAN", icon: "🏠" },
  { value: "internet", label: "Internet", icon: "🌐" },
];

type VisibilityFilterProps = {
  value: VisibilityFilterValue;
  onChange: (next: VisibilityFilterValue) => void;
  counts?: Partial<Record<VisibilityFilterValue, number>>;
};

export function VisibilityFilter({ value, onChange, counts }: VisibilityFilterProps) {
  return (
    <nav
      aria-label="Filtruj po widoczności sieciowej"
      className="flex flex-wrap items-center gap-1.5 px-1"
    >
      {FILTER_OPTIONS.map((option) => {
        const isActive = option.value === value;
        const count = counts?.[option.value];
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
            {typeof count === "number" && (
              <span
                className={`ml-1 rounded-full px-1.5 text-[10px] ${
                  isActive ? "bg-background/20" : "bg-surface-strong"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
