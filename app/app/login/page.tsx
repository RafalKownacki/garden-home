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
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-xl rounded-[32px] border border-stone-200 bg-white p-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Garden</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">{appConfig.appName}</h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-stone-600">
          Portal startowy pokazujący produkcyjne aplikacje dostępne dla zalogowanego użytkownika z realmu garden.
        </p>
        <div className="mt-8">
          <button
            type="button"
            onClick={() => void login()}
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            Zaloguj
          </button>
        </div>
      </section>
    </main>
  );
}
