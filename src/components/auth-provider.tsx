"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type AuthUser = {
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function displayName(email: string) {
  const local = email.split("@")[0]?.trim();
  if (!local) return "Guest";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const viewer = useQuery(
    api.users.viewer,
    isAuthenticated ? {} : "skip",
  );

  const user = useMemo<AuthUser | null>(() => {
    if (!viewer) return null;
    return {
      name: viewer.name.trim() || displayName(viewer.email),
      email: viewer.email,
    };
  }, [viewer]);

  const loading =
    isLoading || (isAuthenticated && viewer === undefined);

  const logout = useCallback(() => {
    void signOut();
  }, [signOut]);

  const value = useMemo(
    () => ({ user, loading, logout }),
    [loading, logout, user],
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
