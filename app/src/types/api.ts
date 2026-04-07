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

export type MatrixApp = { id: string; name: string };

export type MatrixRow = {
  userId: string;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  access: Record<string, boolean>;
};

export type MatrixResponse = {
  apps: MatrixApp[];
  rows: MatrixRow[];
};
