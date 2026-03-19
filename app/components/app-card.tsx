import type { HomeAppCard } from "../src/types/api";

type AppCardProps = {
  app: HomeAppCard;
};

export function AppCard({ app }: AppCardProps) {
  return (
    <article className="flex min-h-52 flex-col justify-between rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Aplikacja</p>
        <h2 className="text-xl font-semibold text-stone-950">{app.name}</h2>
        <p className="text-sm leading-6 text-stone-600">{app.description}</p>
      </div>
      <div className="pt-6">
        <a
          href={app.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
        >
          Otwórz
        </a>
      </div>
    </article>
  );
}
