export type AppTheme = {
  icon: string;
  gradient: string;
  accent: string;
};

export const APP_THEMES: Record<string, AppTheme> = {
  employee: { icon: "👥", gradient: "from-blue-500/10 to-blue-600/5", accent: "bg-blue-500" },
  "lista-plac": { icon: "💵", gradient: "from-blue-400/10 to-blue-500/5", accent: "bg-blue-400" },
  "personnel-notes": { icon: "📋", gradient: "from-violet-500/10 to-violet-600/5", accent: "bg-violet-500" },
  rekrutacja: { icon: "🎯", gradient: "from-indigo-500/10 to-indigo-600/5", accent: "bg-indigo-500" },
  "system-rezerwacji": { icon: "📅", gradient: "from-emerald-500/10 to-emerald-600/5", accent: "bg-emerald-500" },
  "rezerwacje-oaza": { icon: "🌴", gradient: "from-teal-500/10 to-teal-600/5", accent: "bg-teal-500" },
  "rezerwacje-restauracja": { icon: "🍽️", gradient: "from-teal-400/10 to-teal-500/5", accent: "bg-teal-400" },
  "pos-hotelapp": { icon: "🏨", gradient: "from-cyan-500/10 to-cyan-600/5", accent: "bg-cyan-500" },
  "rozliczenie-dnia": { icon: "💰", gradient: "from-amber-500/10 to-amber-600/5", accent: "bg-amber-500" },
  "rozliczenie-dnia-oaza": { icon: "💰", gradient: "from-amber-400/10 to-amber-500/5", accent: "bg-amber-400" },
  "strefa-kelnera": { icon: "🤵", gradient: "from-orange-500/10 to-orange-600/5", accent: "bg-orange-500" },
  recipebook: { icon: "📖", gradient: "from-lime-500/10 to-lime-600/5", accent: "bg-lime-600" },
  magazyn: { icon: "📦", gradient: "from-stone-500/10 to-stone-600/5", accent: "bg-stone-500" },
  zakupy: { icon: "🛒", gradient: "from-green-500/10 to-green-600/5", accent: "bg-green-500" },
  "haccp-panel": { icon: "🔬", gradient: "from-red-500/10 to-red-600/5", accent: "bg-red-500" },
  fincost: { icon: "📊", gradient: "from-yellow-500/10 to-yellow-600/5", accent: "bg-yellow-500" },
  przelewy: { icon: "🏦", gradient: "from-sky-500/10 to-sky-600/5", accent: "bg-sky-500" },
  ksef: { icon: "🧾", gradient: "from-slate-500/10 to-slate-600/5", accent: "bg-slate-500" },
  grello: { icon: "📌", gradient: "from-rose-500/10 to-rose-600/5", accent: "bg-rose-500" },
  marketingowiec: { icon: "📣", gradient: "from-pink-500/10 to-pink-600/5", accent: "bg-pink-500" },
  assets: { icon: "🗄️", gradient: "from-gray-500/10 to-gray-600/5", accent: "bg-gray-500" },
  chat: { icon: "💬", gradient: "from-purple-500/10 to-purple-600/5", accent: "bg-purple-500" },
  metersapp: { icon: "⚡", gradient: "from-yellow-400/10 to-yellow-500/5", accent: "bg-yellow-400" },
  "tereny-zielone": { icon: "🌿", gradient: "from-emerald-400/10 to-emerald-500/5", accent: "bg-emerald-400" },
};

export const DEFAULT_THEME: AppTheme = {
  icon: "📦",
  gradient: "from-stone-500/10 to-stone-600/5",
  accent: "bg-stone-500",
};
