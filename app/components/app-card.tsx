import type { HomeAppCard } from "../src/types/api";

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
  vault:                 { icon: "🗄️", gradient: "from-gray-500/10 to-gray-600/5",     accent: "bg-gray-500" },
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

  return (
    <article
      className={`card-glow animate-card-in group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-5`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Accent top bar */}
      <div className={`absolute inset-x-0 top-0 h-1 ${theme.accent} opacity-60 transition-opacity group-hover:opacity-100`} />

      {/* Subtle gradient background */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <span className="text-2xl" role="img" aria-hidden="true">{theme.icon}</span>
          {app.category && (
            <span className="rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              {app.category}
            </span>
          )}
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
