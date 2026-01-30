import type { User, UserRole, UserPlan } from "@/lib/models";
import { supabase, hasSupabase } from "@/integrations/supabase/client";
import { getProfile, upsertProfile } from "@/services/profileService";
import { nowIso } from "@/utils/db";

export async function getCurrentUser(): Promise<User | null> {
  console.log("[authService] getCurrentUser called.");
  if (!hasSupabase) {
    console.error("[authService] Supabase not configured.");
    throw new Error("Supabase não configurado. Não é possível obter o usuário.");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[authService] Error getting auth user:", authError);
    return null;
  }
  const au = authData.user;
  if (!au) {
    console.log("[authService] No authenticated user found.");
    return null;
  }
  console.log("[authService] Authenticated user:", au.id, au.email);

  const email = au.email ?? "";
  const avatar = (au.user_metadata as Record<string, unknown> | null)?.avatar_url;

  let profileData = null;
  try {
    profileData = await getProfile(au.id);
  } catch (e) {
    console.warn("[authService] Initial profile fetch failed, attempting upsert:", e);
  }

  if (!profileData) {
    console.log("[authService] Profile not found, attempting to upsert for user:", au.id);
    try {
      await upsertProfile({
        id: au.id,
        firstName: (au.user_metadata as any)?.first_name || "Usuário",
        lastName: (au.user_metadata as any)?.last_name || "",
        email,
        phone: "",
        cpf: "",
        company: "",
        role: "corretor",
        plan: "free",
        avatarUrl: typeof avatar === "string" ? avatar : "",
      });
      console.log("[authService] Profile upserted successfully for user:", au.id);
      profileData = await getProfile(au.id); // Fetch again to get the complete profile data
    } catch (e) {
      console.error("[authService] Failed to upsert or fetch profile after upsert:", e);
      throw new Error("Falha ao carregar perfil do usuário após criação/atualização.");
    }
  }

  if (!profileData) {
    console.error("[authService] Profile data is still null after all attempts for user:", au.id);
    throw new Error("Perfil do usuário não encontrado ou não pôde ser criado.");
  }

  console.log("[authService] Returning user object:", profileData.email);
  return {
    id: au.id,
    name: profileData.first_name ?? (au.user_metadata as any)?.first_name ?? "Usuário",
    lastName: profileData.last_name ?? (au.user_metadata as any)?.last_name ?? "",
    email: profileData.email ?? email,
    phone: profileData.phone ?? "",
    cpf: profileData.cpf ?? "",
    company: profileData.company ?? "",
    role: (profileData.role as UserRole) ?? "corretor",
    plan: (profileData.plan as UserPlan) ?? "free",
    photoUrl: profileData.avatar_url || (typeof avatar === "string" ? avatar : undefined),
    createdAt: profileData.created_at ?? nowIso(),
  };
}

export async function logout() {
  console.log("[authService] Logging out...");
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível fazer logout.");
  await supabase.auth.signOut();
  console.log("[authService] Logout successful.");
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  console.log("[authService] Attempting login with email:", email);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível fazer login.");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log("[authService] signInWithPassword result:", { data, error });
  if (error) {
    console.error("[authService] Error during email login:", error);
    throw new Error(error.message);
  }
  console.log("[authService] Email login successful.");

  const u = await getCurrentUser();
  if (!u) {
    console.error("[authService] Failed to get current user after email login.");
    throw new Error("Falha ao carregar sessão");
  }
  return u;
}

export async function loginWithGoogle(): Promise<void> {
  console.log("[authService] Attempting Google login...");
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível fazer login com Google.");

  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  console.log("[authService] signInWithOAuth result:", { error });
  if (error) {
    console.error("[authService] Error during Google login:", error);
    throw new Error(error.message);
  }
  console.log("[authService] Google login initiated (redirecting).");
}

export async function registerWithEmail(args: {
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  cpf?: string;
  company?: string;
  password: string;
  role: UserRole;
}): Promise<User> {
  console.log("[authService] Registering with email:", args.email);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível registrar.");

  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        first_name: args.name,
        last_name: args.lastName ?? "",
      },
    },
  });
  console.log("[authService] signUp result:", { data, error });
  if (error) {
    console.error("[authService] Error during Supabase signUp:", error);
    throw new Error(error.message);
  }
  const au = data.user;
  if (!au) {
    console.error("[authService] SignUp successful but no user data returned.");
    throw new Error("Cadastro criado, mas usuário não retornou");
  }
  console.log("[authService] Supabase auth user created:", au.id, au.email, au.user_metadata);

  await upsertProfile({
    id: au.id,
    firstName: args.name,
    lastName: args.lastName ?? "",
    email: args.email,
    phone: args.phone ?? "",
    cpf: args.cpf ?? "",
    company: args.company ?? "",
    role: args.role,
    plan: "free",
    avatarUrl: "",
  });
  console.log("[authService] Profile upserted after registration for user:", au.id);

  const u = await getCurrentUser();
  if (!u) {
    console.warn("[authService] getCurrentUser returned null after registration. Returning fallback profile.");
    return {
      id: au.id,
      name: args.name,
      lastName: args.lastName ?? "",
      email: args.email,
      phone: args.phone ?? "",
      cpf: args.cpf ?? "",
      company: args.company ?? "",
      role: args.role,
      plan: "free",
      createdAt: nowIso(),
    };
  }
  console.log("[authService] getCurrentUser returned user after registration:", u.email);
  return u;
}

export async function requestPasswordReset(email: string) {
  console.log("[authService] Requesting password reset for email:", email);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível redefinir a senha.");

  const redirectTo = `${window.location.origin}/auth/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  console.log("[authService] resetPasswordForEmail result:", { error });
  if (error) {
    console.error("[authService] Error during password reset request:", error);
    throw new Error(error.message);
  }
  console.log("[authService] Password reset request successful.");
  return true;
}