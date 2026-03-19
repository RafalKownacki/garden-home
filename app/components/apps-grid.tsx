import type { HomeAppCard } from "../src/types/api";
import { AppCard } from "./app-card";

type AppsGridProps = {
  apps: HomeAppCard[];
};

export function AppsGrid({ apps }: AppsGridProps) {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </section>
  );
}
