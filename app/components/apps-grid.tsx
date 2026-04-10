import type { HomeAppCard } from "../src/types/api";
import { AppCard } from "./app-card";

type AppsGridProps = {
  apps: HomeAppCard[];
};

export function AppsGrid({ apps }: AppsGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map((app, i) => (
        <AppCard key={app.id} app={app} index={i} />
      ))}
    </section>
  );
}
