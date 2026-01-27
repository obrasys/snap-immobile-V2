import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User, UserRole } from "@/lib/models";
import {
  getCurrentUser,
  loginWithEmail,
  loginWithGoogle,
  logout as dbLogout,
  registerWithEmail,
  requestPasswordReset,
} from "@/lib/snapdb";
import { hasSupabase, supabase } from "@/lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  isReady: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  register: (args: {
    name: string;
    lastName?: string;
    email: string;
    phone?: string;
    cpf?: string;
    company?: string;
    password: string;
    role: UserRole;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  async function refresh() {
    const u = await getCurrentUser();
    setUser(u);
    setIsReady(true);
  }

  useEffect(() => {
    refresh();

    if (!hasSupabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await refresh();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      refresh,
      login: async (email, password) => {
        const u = await loginWithEmail(email, password);
        setUser(u);
        setIsReady(true);
      },
      loginGoogle: async () => {
        await loginWithGoogle();
        // em OAuth, a página redireciona; se estiver no modo fallback local,
        // loginWithGoogle já cria sessão e podemos atualizar.
        await refresh();
      },
      register: async (args) => {
        const u = await registerWithEmail(args);
        setUser(u);
        setIsReady(true);
      },
      resetPassword: async (email) => {
        await requestPasswordReset(email);
      },
      logout: async () => {
        await dbLogout();
        setUser(null);
        setIsReady(true);
      },
    }),
    [user, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}