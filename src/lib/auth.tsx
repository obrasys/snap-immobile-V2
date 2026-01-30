import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User, UserRole } from "@/lib/models";
import {
  getCurrentUser,
  loginWithEmail,
  loginWithGoogle,
  logout,
  registerWithEmail,
  requestPasswordReset,
} from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabase } from "@/integrations/supabase/client";

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
    console.log("[AuthContext] Refreshing user...");
    const u = await getCurrentUser();
    setUser(u);
    console.log("[AuthContext] User after refresh:", u ? u.email : "null");
  }

  useEffect(() => {
    if (!hasSupabase) {
      console.warn("[AuthContext] Supabase not configured. Auth will not function.");
      setIsReady(true); // Mark as ready even without Supabase to avoid blocking the app
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth state changed:", event, session?.user?.email);
      if (event === 'INITIAL_SESSION') {
        // Only set initial user and ready state after Supabase has checked for a session
        await refresh();
        setIsReady(true);
      } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        await refresh();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once on mount

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      refresh,
      login: async (email, password) => {
        console.log("[AuthContext] Attempting login...");
        await loginWithEmail(email, password);
        await refresh();
        console.log("[AuthContext] Login process completed.");
      },
      loginGoogle: async () => {
        console.log("[AuthContext] Attempting Google login...");
        await loginWithGoogle();
        // Google login initiates a redirect, so refresh will happen on callback page
        console.log("[AuthContext] Google login process initiated (redirecting).");
      },
      register: async (args) => {
        console.log("[AuthContext] Attempting registration...");
        await registerWithEmail(args);
        await refresh();
        console.log("[AuthContext] Registration process completed.");
      },
      resetPassword: async (email) => {
        console.log("[AuthContext] Attempting password reset...");
        await requestPasswordReset(email);
        console.log("[AuthContext] Password reset process completed.");
      },
      logout: async () => {
        console.log("[AuthContext] Attempting logout...");
        await logout();
        setUser(null);
        // No need to setIsReady(true) here, as it's already true and handled by onAuthStateChange
        console.log("[AuthContext] Logout process completed.");
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