import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyRegistrationKey(req: Request, res: Response, next: NextFunction): void {
  const expected = config.registrationKey;
  if (!expected) {
    res.status(503).json({ error: "REGISTRATION_KEY_NOT_CONFIGURED" });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "MISSING_REGISTRATION_KEY" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token || !safeCompare(token, expected)) {
    res.status(401).json({ error: "INVALID_REGISTRATION_KEY" });
    return;
  }

  next();
}
