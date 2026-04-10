"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/auth/use-auth";
import { appConfig } from "@/src/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isReady, router]);

  return (
    <main className="ambient-bg flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <section className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white shadow-lg shadow-accent/20">
          G
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-foreground">
          {appConfig.appName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Centralny portal aplikacji Garden.<br />
          Zaloguj się, aby zobaczyć swoje aplikacje.
        </p>

        <button
          type="button"
          onClick={() => void login()}
          className="mt-8 w-full rounded-xl bg-foreground px-5 py-3.5 text-sm font-semibold text-background transition hover:opacity-80 active:scale-[0.98]"
        >
          Zaloguj się przez Keycloak
        </button>

        <p className="mt-6 text-xs text-muted/60">
          auth.grdn.pl &middot; realm garden
        </p>
      </section>
    </main>
  );
}
