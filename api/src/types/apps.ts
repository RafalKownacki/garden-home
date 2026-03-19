import type { HomeAppCard } from "../../../shared/app-types.js";

export type AppsResponse = {
  count: number;
  apps: HomeAppCard[];
};
