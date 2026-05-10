import type { MatrixApp, MatrixRow } from "@/src/types/api";

const CATEGORY_ORDER = ["kadry", "rezerwacje", "restauracja", "finanse", "narzędzia", "infrastruktura"];
const CATEGORY_LABELS: Record<string, string> = {
  kadry: "Kadry",
  rezerwacje: "Rezerwacje",
  restauracja: "Restauracja",
  finanse: "Finanse",
  "narzędzia": "Narzędzia",
  infrastruktura: "Infrastruktura",
};

type AppGroup = { category: string; label: string; apps: MatrixApp[] };

function groupAppsByCategory(apps: MatrixApp[]): AppGroup[] {
  const map = new Map<string, MatrixApp[]>();
  for (const app of apps) {
    const cat = app.category ?? "inne";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(app);
  }
  const ordered = CATEGORY_ORDER.filter((c) => map.has(c));
  const extra = [...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c));
  return [...ordered, ...extra].map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    apps: map.get(cat)!,
  }));
}

export function countAccess(row: MatrixRow, apps: MatrixApp[]): { has: number; total: number } {
  let has = 0;
  for (const app of apps) {
    if (row.access[app.id]) has++;
  }
  return { has, total: apps.length };
}

export function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
      {initials || "?"}
    </div>
  );
}

export function RoleBadge({ row }: { row: MatrixRow }) {
  if (row.isService) {
    return (
      <span className="rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-muted">
        Serwis
      </span>
    );
  }
  if (row.isAdmin) {
    return (
      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        Admin
      </span>
    );
  }
  return (
    <span className="rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-muted">
      User
    </span>
  );
}

export function MatrixAccessDetail({ row, apps }: { row: MatrixRow; apps: MatrixApp[] }) {
  const groups = groupAppsByCategory(apps);
  const hasAccess: AppGroup[] = [];
  const noAccess: AppGroup[] = [];

  for (const group of groups) {
    const yes = group.apps.filter((a) => row.access[a.id]);
    const no = group.apps.filter((a) => !row.access[a.id]);
    if (yes.length > 0) hasAccess.push({ ...group, apps: yes });
    if (no.length > 0) noAccess.push({ ...group, apps: no });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Initials name={row.displayName || row.username} />
        <div>
          <p className="text-sm font-semibold text-foreground">{row.displayName || row.username}</p>
          {row.displayName && <p className="text-xs text-muted">{row.username}</p>}
        </div>
        <RoleBadge row={row} />
      </div>

      <AccessGroupList
        title="Ma dostęp"
        count={hasAccess.reduce((sum, group) => sum + group.apps.length, 0)}
        emptyText="Brak dostępu do żadnej aplikacji."
        groups={hasAccess}
        tone="positive"
      />

      <AccessGroupList
        title="Brak dostępu"
        count={noAccess.reduce((sum, group) => sum + group.apps.length, 0)}
        emptyText="Ma dostęp do wszystkich aplikacji."
        groups={noAccess}
        tone="muted"
      />
    </div>
  );
}

function AccessGroupList({
  title,
  count,
  emptyText,
  groups,
  tone,
}: {
  title: string;
  count: number;
  emptyText: string;
  groups: AppGroup[];
  tone: "positive" | "muted";
}) {
  const titleClass =
    tone === "positive"
      ? "mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400"
      : "mb-2 text-xs font-semibold uppercase tracking-wider text-muted";
  const labelClass =
    tone === "positive"
      ? "mb-1 text-[10px] font-medium uppercase tracking-wider text-muted"
      : "mb-1 text-[10px] font-medium uppercase tracking-wider text-muted/60";
  const badgeClass =
    tone === "positive"
      ? "rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      : "rounded-md bg-surface-strong px-2 py-0.5 text-xs font-medium text-muted";

  return (
    <section>
      <h3 className={titleClass}>
        {title} ({count})
      </h3>
      {groups.length === 0 ? (
        <p className="text-xs text-muted">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((group) => (
            <div key={group.category}>
              <p className={labelClass}>{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.apps.map((app) => (
                  <span key={app.id} className={badgeClass}>
                    {app.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
