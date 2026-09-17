import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest, ApiError, setAccessToken } from "./api-client";

export interface AuthUser {
  id: string;
  nev: string;
  email: string;
  szerep: "tulaj" | "recepcio" | "szerelo";
}

interface LoginResponse {
  accessToken: string;
  felhasznalo: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  bejelentkezve: boolean;
  betoltve: boolean;
  belepes: (email: string, jelszo: string) => Promise<void>;
  munkamenetBeallitasa: (accessToken: string, felhasznalo: AuthUser) => void;
  kilepes: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [betoltve, setBetoltve] = useState(false);

  const munkamenetBeallitasa = useCallback((accessToken: string, felhasznalo: AuthUser) => {
    setAccessToken(accessToken);
    setUser(felhasznalo);
  }, []);

  // Restores the session from the HttpOnly refresh-token cookie on first load, so a
  // browser refresh doesn't silently log the user out while their cookie is still valid.
  useEffect(() => {
    apiRequest<LoginResponse>("/auth/refresh", { method: "POST" })
      .then((response) => munkamenetBeallitasa(response.accessToken, response.felhasznalo))
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error(error);
        }
      })
      .finally(() => setBetoltve(true));
  }, [munkamenetBeallitasa]);

  const belepes = useCallback(
    async (email: string, jelszo: string) => {
      const response = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, jelszo },
      });
      munkamenetBeallitasa(response.accessToken, response.felhasznalo);
    },
    [munkamenetBeallitasa],
  );

  const kilepes = useCallback(async () => {
    await apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, bejelentkezve: user !== null, betoltve, belepes, munkamenetBeallitasa, kilepes }),
    [user, betoltve, belepes, munkamenetBeallitasa, kilepes],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth csak AuthProvider-en belül használható.");
  }
  return ctx;
}
