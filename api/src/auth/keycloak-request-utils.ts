import type { Request } from "express";
import { config } from "../config.js";

function getForwardedHeader(req: Request, name: string): string {
  return String(req.headers[name] || "").split(",")[0].trim();
}

export function resolveRequestOrigin(req: Request): string {
  const forwardedProto = getForwardedHeader(req, "x-forwarded-proto");
  const forwardedHost = getForwardedHeader(req, "x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const origin = String(req.headers.origin || "").trim();
  if (/^https?:\/\//i.test(origin)) {
    return origin.replace(/\/$/, "");
  }

  const referer = String(req.headers.referer || "").trim();
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore invalid referer
    }
  }

  if (/^https?:\/\//i.test(config.corsOrigin)) {
    return config.corsOrigin.replace(/\/$/, "");
  }

  const proto = forwardedProto || req.protocol || "http";
  const host = forwardedHost || String(req.get("host") || "").trim() || "localhost";
  return `${proto}://${host}`;
}

export function getSafeReturnPath(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\n") || value.includes("\r")) return "/";
  if (value.startsWith("/api/")) return "/";
  if (value.startsWith("/v1/auth/")) return "/";
  return value;
}

export function appendAuthError(pathname: string, authError: string): string {
  const base = pathname || "/";
  const url = new URL(base, "http://local");
  url.searchParams.set("authError", authError);
  return `${url.pathname}${url.search}`;
}

export function shouldSecureCookies(req: Request): boolean {
  return resolveRequestOrigin(req).startsWith("https://");
}
