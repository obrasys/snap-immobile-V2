import React, { createContext, useContext, useMemo, useState } from "react";
import type { User, UserRole } from "@/lib/models";
import {
  getCurrentUser,
  loginWithEmail,
  loginWithGoogleDemo,
  logout as dbLogout,
  registerWithEmail,
  requestPasswordReset,
} from "@/lib/snapdb";

type AuthContextValue = {
  user: User | null;
  refresh: () => void;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  register: (args: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      refresh: () => setUser(getCurrentUser()),
      login: async (email, password) => {
        const u = loginWithEmail(email, password);
        setUser(u);
      },
      loginGoogle: async () => {
        const u = loginWithGoogleDemo();
        setUser(u);
      },
      register: async (args) => {
        const u = registerWithEmail(args);
        setUser(u);
      },
      resetPassword: async (email) => {
        requestPasswordReset(email);
      },
      logout: () => {
        dbLogout();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
