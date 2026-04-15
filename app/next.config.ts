import type { NextConfig } from "next";
import path from "node:path";

const publicApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
const apiProxyTarget = (
  process.env.API_PROXY_TARGET ||
  (/^https?:\/\//i.test(publicApiBaseUrl) ? publicApiBaseUrl : "http://127.0.0.1:19010")
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.14.55"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`
      }
    ];
  },
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
