"use client";

import type { PropsWithChildren } from "react";
import { AuthProvider } from "../src/auth/auth-provider";

export default function Providers({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}
