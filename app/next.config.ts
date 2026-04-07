import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.14.55"],
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
