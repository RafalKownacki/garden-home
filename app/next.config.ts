import type { NextConfig } from "next";
import path from "node:path";

const noIndexHeaders = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

function withNoIndexHeaders(config: NextConfig): NextConfig {
  const existingHeaders = config.headers;
  return {
    ...config,
    async headers() {
      const headers = existingHeaders ? await existingHeaders() : [];
      return [
        {
          source: '/:path*',
          headers: noIndexHeaders,
        },
        ...(headers ?? []),
      ];
    },
  };
}
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

export default withNoIndexHeaders(nextConfig);
