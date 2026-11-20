"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthUser = {
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => AuthUser;
  logout: () => void;
};

const STORAGE_KEY = "xpense-session";
const AuthContext = createContext<AuthContextValue | null>(null);

function displayName(email: string) {
  const local = email.split("@")[0]?.trim();
  if (!local) return "Guest";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A timer, not requestAnimationFrame: rAF is paused in background tabs and
    // would leave the app stuck on the session skeleton.
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AuthUser;
          if (parsed?.email) setUser(parsed);
        }
      } catch {
        // Mock sessions are best-effort only.
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const login = useCallback((email: string, password: string) => {
    void password;
    const trimmed = email.trim() || "demo@expense.app";
    const next: AuthUser = {
      email: trimmed,
      name: displayName(trimmed),
    };
    setUser(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The in-memory session still works.
    }
    return next;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory session is already cleared.
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [loading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
