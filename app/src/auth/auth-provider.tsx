"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import type { KeycloakInitOptions } from "keycloak-js";
import { apiGet } from "../lib/api";
import { appConfig } from "../lib/config";
import type { AppsResponse } from "../types/api";
import type { AuthContextValue, MeResponse } from "../types/auth";
import {
  buildAuthorizeUrl,
  buildLogoutUrl,
  getKeycloak,
  isSecureBrowserContext,
  tryHandleImplicitCallback
} from "./auth-client";

const STORAGE_KEY = "garden_home_token";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function buildInitOptions(): KeycloakInitOptions {
  return {
    flow: "standard",
    responseMode: "query",
    checkLoginIframe: false,
    pkceMethod: "S256"
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const secureContext = isSecureBrowserContext();
  const initStartedRef = useRef(false);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MeResponse | null>(null);

  const loadProfile = useCallback(async (resolvedToken: string) => {
    const me = await apiGet<MeResponse>("/v1/auth/me", resolvedToken);
    setProfile(me);
    return me;
  }, []);

  const loadAppsWarmup = useCallback(async (resolvedToken: string) => {
    await apiGet<AppsResponse>("/v1/apps", resolvedToken);
  }, []);

  const login = useCallback(
    async (forcePrompt = false) => {
      if (!appConfig.keycloakEnabled) {
        setIsReady(true);
        return;
      }

      if (!secureContext) {
        window.location.assign(buildAuthorizeUrl(forcePrompt));
        return;
      }

      const keycloak = getKeycloak();
      if (!initPromiseRef.current) {
        initPromiseRef.current = keycloak.init(buildInitOptions());
      }
      const authenticated = await initPromiseRef.current;

      if (!authenticated || forcePrompt) {
        await keycloak.login({
          redirectUri: `${window.location.origin}/`,
          prompt: forcePrompt ? "login" : undefined,
          maxAge: forcePrompt ? 0 : undefined
        });
        return;
      }

      const resolvedToken = keycloak.token ?? null;
      if (!resolvedToken) return;
      localStorage.setItem(STORAGE_KEY, resolvedToken);
      setToken(resolvedToken);
      await loadProfile(resolvedToken);
    },
    [loadProfile, secureContext]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setProfile(null);

    if (!appConfig.keycloakEnabled) return;

    if (!secureContext) {
      window.location.assign(buildLogoutUrl());
      return;
    }

    const keycloak = getKeycloak();
    await keycloak.logout({ redirectUri: `${window.location.origin}/login` });
  }, [secureContext]);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const boot = async () => {
      if (!appConfig.keycloakEnabled) {
        setIsReady(true);
        return;
      }

      if (!secureContext) {
        const implicitToken = tryHandleImplicitCallback();
        const storedToken = implicitToken || localStorage.getItem(STORAGE_KEY);
        if (implicitToken) {
          localStorage.setItem(STORAGE_KEY, implicitToken);
        }
        if (storedToken) {
          setToken(storedToken);
          try {
            await loadProfile(storedToken);
            await loadAppsWarmup(storedToken);
          } catch {
            localStorage.removeItem(STORAGE_KEY);
            setToken(null);
            setProfile(null);
          }
        }
        setIsReady(true);
        return;
      }

      try {
        const keycloak = getKeycloak();
        initPromiseRef.current = keycloak.init(buildInitOptions());
        const authenticated = await initPromiseRef.current;
        const resolvedToken = authenticated ? keycloak.token ?? null : null;
        if (resolvedToken) {
          localStorage.setItem(STORAGE_KEY, resolvedToken);
          setToken(resolvedToken);
          await loadProfile(resolvedToken);
          await loadAppsWarmup(resolvedToken);
        }
      } catch {
        setToken(null);
        setProfile(null);
      } finally {
        setIsReady(true);
      }
    };

    void boot();
  }, [loadAppsWarmup, loadProfile, secureContext]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isEnabled: appConfig.keycloakEnabled,
      isReady,
      isAuthenticated: Boolean(token),
      token,
      profile,
      login,
      logout
    }),
    [isReady, token, profile, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
