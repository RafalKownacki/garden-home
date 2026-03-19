export type HomeAppCard = {
  id: string;
  name: string;
  description: string;
  url: string;
  category?: string;
};

export type AppsResponse = {
  count: number;
  apps: HomeAppCard[];
};
