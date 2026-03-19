import type { HomeAppCard, ScannedAppCandidate } from "../../../shared/app-types.js";

export type AppsResponse = {
  count: number;
  apps: HomeAppCard[];
};

export type ScanReportResponse = {
  generatedAt: string;
  projectsRoot: string;
  count: number;
  candidates: ScannedAppCandidate[];
};
