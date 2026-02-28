import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { User, UserRole } from "@/lib/models";
import {
  getCurrentUser,
  loginWithEmail,
  loginWithGoogle,
  logout,
  registerWithEmail,
  requestPasswordReset,
} from "@/services/authService";
import { supabase, hasSupabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  isReady: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  register: (args: any) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
  }, []);

  useEffect(() => {
    if (!hasSupabase) {
      setIsReady(true);
      return;
    }

    // Carregamento inicial rápido
    refresh().finally(() => setIsReady(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        await refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo(() => ({
    user,
    isReady,
    refresh,
    login: async (email: string, pass: string) => {
      await loginWithEmail(email, pass);
      await refresh();
    },
    loginGoogle: async () => {
      await loginWithGoogle();
    },
    register: async (args: any) => {
      await registerWithEmail(args);
    },
    resetPassword: async (email: string) => {
      await requestPasswordReset(email);
    },
    logout: async () => {
      await logout();
      setUser(null);
    },
  }), [user, isReady, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}