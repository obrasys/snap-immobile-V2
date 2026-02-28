import type { User, UserRole, UserPlan } from "@/lib/models";
import { supabase, hasSupabase } from "@/integrations/supabase/client";
import { getProfile } from "@/services/profileService";
import { nowIso } from "@/utils/db";

export async function getCurrentUser(): Promise<User | null> {
  if (!hasSupabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const au = authData.user;
  
  try {
    // O perfil é criado automaticamente via Trigger no Supabase (handle_new_user)
    const profileData = await getProfile(au.id);
    
    if (!profileData) {
      console.warn("[authService] Perfil não encontrado para o usuário:", au.id);
      return null;
    }

    return {
      id: au.id,
      name: profileData.first_name ?? "Usuário",
      lastName: profileData.last_name ?? "",
      email: profileData.email ?? au.email ?? "",
      phone: profileData.phone ?? "",
      cpf: profileData.cpf ?? "",
      company: profileData.company ?? "",
      role: (profileData.role as UserRole) || "corretor",
      plan: (profileData.plan as UserPlan) || "free",
      photoUrl: profileData.avatar_url ?? undefined,
      createdAt: profileData.updated_at ?? nowIso(),
    };
  } catch (e) {
    console.error("[authService] Erro ao carregar perfil:", e);
    return null;
  }
}

export async function logout() {
  if (!hasSupabase) return;
  await supabase.auth.signOut();
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const u = await getCurrentUser();
  if (!u) throw new Error("Falha ao carregar sessão");
  return u;
}

export async function loginWithGoogle(): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function registerWithEmail(args: {
  name: string;
  lastName?: string;
  email: string;
  password: string;
}): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        first_name: args.name,
        last_name: args.lastName ?? "",
      },
    },
  });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/auth/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
  return true;
}