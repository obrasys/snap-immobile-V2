import { startOfMonth } from "date-fns";
import type { HDRSession, PhotoMode, Property, User, UserPlan, UserRole } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabase } from "@/integrations/supabase/client";
import { dataUrlToBlob } from "@/lib/fileActions";
import { getMimeType } from "@/utils/helpers";

function nowIso() {
  return new Date().toISOString();
}

async function getProfile(userId: string) {
  console.log(`[snapdb] Fetching profile for userId: ${userId}`);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, cpf, company, role, plan, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[snapdb] Error fetching profile:", error);
    throw error;
  }
  console.log(`[snapdb] Profile data for ${userId}:`, data);
  return data;
}

async function upsertProfile(input: {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  cpf?: string;
  company?: string;
  role: UserRole;
  plan: UserPlan;
  avatarUrl?: string;
}) {
  console.log("[snapdb] Upserting profile for user:", input.id);
  const { error } = await supabase.from("profiles").upsert({
    id: input.id,
    first_name: input.firstName,
    last_name: input.lastName ?? "",
    email: input.email,
    phone: input.phone ?? "",
    cpf: input.cpf ?? "",
    company: input.company ?? "",
    role: input.role,
    plan: input.plan,
    avatar_url: input.avatarUrl ?? "",
    updated_at: nowIso(), // Use updated_at for upsert
  });
  if (error) {
    console.error("[snapdb] Error during profile upsert:", error);
    throw error;
  }
  console.log("[snapdb] Profile upserted successfully for user:", input.id);
}

export const planLimits: Record<UserPlan, { hdrPerMonth: number }> = {
  free: { hdrPerMonth: 15 },
  pro: { hdrPerMonth: 999999 },
};

export async function getCurrentUser(): Promise<User | null> {
  console.log("[snapdb] getCurrentUser called.");
  if (!hasSupabase) {
    console.error("[snapdb] Supabase not configured.");
    throw new Error("Supabase não configurado. Não é possível obter o usuário.");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[snapdb] Error getting auth user:", authError);
    return null;
  }
  const au = authData.user;
  if (!au) {
    console.log("[snapdb] No authenticated user found.");
    return null;
  }
  console.log("[snapdb] Authenticated user:", au.id, au.email);

  const email = au.email ?? "";
  const avatar = (au.user_metadata as Record<string, unknown> | null)?.avatar_url;

  let profileData = null;
  try {
    profileData = await getProfile(au.id);
  } catch (e) {
    console.warn("[snapdb] Initial profile fetch failed, attempting upsert:", e);
  }

  if (!profileData) {
    console.log("[snapdb] Profile not found, attempting to upsert for user:", au.id);
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
      console.log("[snapdb] Profile upserted successfully for user:", au.id);
      // After upsert, try to fetch again to get the complete profile data
      profileData = await getProfile(au.id);
    } catch (e) {
      console.error("[snapdb] Failed to upsert or fetch profile after upsert:", e);
      throw new Error("Falha ao carregar perfil do usuário após criação/atualização.");
    }
  }

  if (!profileData) {
    console.error("[snapdb] Profile data is still null after all attempts for user:", au.id);
    throw new Error("Perfil do usuário não encontrado ou não pôde ser criado.");
  }

  console.log("[snapdb] Returning user object:", profileData.email);
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
  console.log("[snapdb] Logging out...");
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível fazer logout.");
  await supabase.auth.signOut();
  console.log("[snapdb] Logout successful.");
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  console.log("[snapdb] Attempting login with email:", email);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível fazer login.");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log("[snapdb] signInWithPassword result:", { data, error });
  if (error) {
    console.error("[snapdb] Error during email login:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Email login successful.");

  const u = await getCurrentUser();
  if (!u) {
    console.error("[snapdb] Failed to get current user after email login.");
    throw new Error("Falha ao carregar sessão");
  }
  return u;
}

export async function loginWithGoogle(): Promise<void> {
  console.log("[snapdb] Attempting Google login...");
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível fazer login com Google.");

  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  console.log("[snapdb] signInWithOAuth result:", { error });
  if (error) {
    console.error("[snapdb] Error during Google login:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Google login initiated (redirecting).");
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
  console.log("[snapdb] Registering with email:", args.email);
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
  console.log("[snapdb] signUp result:", { data, error });
  if (error) {
    console.error("[snapdb] Error during Supabase signUp:", error);
    throw new Error(error.message);
  }
  const au = data.user;
  if (!au) {
    console.error("[snapdb] SignUp successful but no user data returned.");
    throw new Error("Cadastro criado, mas usuário não retornou");
  }
  console.log("[snapdb] Supabase auth user created:", au.id, au.email, au.user_metadata);

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
  console.log("[snapdb] Profile upserted after registration for user:", au.id);

  // Em projetos com confirmação de e-mail habilitada, a sessão pode não existir ainda.
  const u = await getCurrentUser();
  if (!u) {
    console.warn("[snapdb] getCurrentUser returned null after registration. Returning fallback profile.");
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
  console.log("[snapdb] getCurrentUser returned user after registration:", u.email);
  return u;
}

export async function requestPasswordReset(email: string) {
  console.log("[snapdb] Requesting password reset for email:", email);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível redefinir a senha.");

  const redirectTo = `${window.location.origin}/auth/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  console.log("[snapdb] resetPasswordForEmail result:", { error });
  if (error) {
    console.error("[snapdb] Error during password reset request:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Password reset request successful.");
  return true;
}

export async function listProperties(userId: string): Promise<Property[]> {
  console.log("[snapdb] Listing properties for user:", userId);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível listar imóveis.");

  const { data, error } = await supabase
    .from("properties")
    .select("id, user_id, name, address, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[snapdb] Error listing properties:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Properties listed:", data?.length);
  return (
    data?.map((p) => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      address: p.address,
      description: p.description ?? "",
      createdAt: p.created_at,
    })) ?? []
  );
}

export async function getProperty(propertyId: string): Promise<Property | null> {
  console.log("[snapdb] Getting property:", propertyId);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível obter o imóvel.");

  const { data, error } = await supabase
    .from("properties")
    .select("id, user_id, name, address, description, created_at")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    console.error("[snapdb] Error getting property:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Property data:", data ? data.name : "null");
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    address: data.address,
    description: data.description ?? "",
    createdAt: data.created_at,
  };
}

export async function createProperty(args: {
  userId: string;
  name: string;
  address: string;
  description?: string;
}): Promise<Property> {
  console.log("[snapdb] Creating property:", args.name);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível criar imóvel.");

  const { data, error } = await supabase
    .from("properties")
    .insert({
      user_id: args.userId,
      name: args.name,
      address: args.address,
      description: args.description ?? "",
    })
    .select("id, user_id, name, address, description, created_at")
    .single();

  if (error) {
    console.error("[snapdb] Error creating property:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Property created:", data.id);
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    address: data.address,
    description: data.description ?? "",
    createdAt: data.created_at,
  };
}

export async function listSessions(propertyId: string): Promise<HDRSession[]> {
  console.log("[snapdb] Listing sessions for property:", propertyId);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível listar sessões.");

  const { data, error } = await supabase
    .from("hdr_sessions")
    .select("id, property_id, images_count, hdr_image_url, status, error_message, created_at, mode")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[snapdb] Error listing sessions:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Sessions listed:", data?.length);
  return (
    data?.map((s) => ({
      id: s.id,
      propertyId: s.property_id,
      imagesCount: s.images_count,
      hdrImageUrl: s.hdr_image_url ?? undefined,
      status: s.status,
      errorMessage: s.error_message ?? undefined,
      createdAt: s.created_at,
      mode: s.mode as PhotoMode ?? undefined,
    })) ?? []
  );
}

export async function canCreateHdrSession(userId: string): Promise<{
  ok: boolean;
  usedThisMonth: number;
  limitThisMonth: number;
}> {
  console.log("[snapdb] Checking HDR session limit for user:", userId);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível verificar o limite de sessões.");

  const user = await getCurrentUser();
  if (!user) return { ok: false, usedThisMonth: 0, limitThisMonth: 0 };

  const limitThisMonth = planLimits[user.plan].hdrPerMonth;
  const monthStart = startOfMonth(new Date()).toISOString();

  const { count, error } = await supabase
    .from("hdr_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  if (error) {
    console.error("[snapdb] Error checking HDR session count:", error);
    throw new Error(error.message);
  }
  const usedThisMonth = count ?? 0;
  console.log(`[snapdb] HDR sessions used this month: ${usedThisMonth}/${limitThisMonth}`);
  return { ok: usedThisMonth < limitThisMonth, usedThisMonth, limitThisMonth };
}

export async function createHdrSession(args: {
  userId: string;
  propertyId: string;
  imagesCount: number;
  mode: PhotoMode;
  id?: string;
}): Promise<HDRSession> {
  console.log("[snapdb] Creating HDR session for property:", args.propertyId);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível criar sessão HDR.");

  const { data, error } = await supabase
    .from("hdr_sessions")
    .insert({
      id: args.id,
      user_id: args.userId,
      property_id: args.propertyId,
      images_count: args.imagesCount,
      status: "processing",
      mode: args.mode,
    })
    .select("id, property_id, images_count, hdr_image_url, status, error_message, created_at, mode")
    .single();

  if (error) {
    console.error("[snapdb] Error creating HDR session:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] HDR session created:", data.id);
  return {
    id: data.id,
    propertyId: data.property_id,
    imagesCount: data.images_count,
    hdrImageUrl: data.hdr_image_url ?? undefined,
    status: data.status,
    errorMessage: data.error_message ?? undefined,
    createdAt: data.created_at,
    mode: data.mode as PhotoMode ?? undefined,
  };
}

export async function updateHdrSession(sessionId: string, patch: Partial<HDRSession>) {
  console.log("[snapdb] Updating HDR session:", sessionId, patch);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível atualizar sessão HDR.");

  const mapped: Record<string, unknown> = {};
  if (typeof patch.status !== "undefined") mapped.status = patch.status;
  if (typeof patch.hdrImageUrl !== "undefined") mapped.hdr_image_url = patch.hdrImageUrl;
  if (typeof patch.errorMessage !== "undefined") mapped.error_message = patch.errorMessage;
  if (typeof patch.mode !== "undefined") mapped.mode = patch.mode;

  const { error } = await supabase.from("hdr_sessions").update(mapped).eq("id", sessionId);
  if (error) {
    console.error("[snapdb] Error updating HDR session:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] HDR session updated:", sessionId);
}

export async function uploadHdrImage(userId: string, sessionId: string, base64Image: string): Promise<string> {
  console.log("[snapdb] Uploading HDR image for session:", sessionId);
  if (!hasSupabase) throw new Error("Supabase não configurado para upload de imagens.");

  const blob = dataUrlToBlob(base64Image);
  const mimeType = getMimeType(base64Image);
  const filePath = `${userId}/${sessionId}.${mimeType.split('/')[1] || 'jpeg'}`;

  const { data, error } = await supabase.storage
    .from('snap-immobile-photos')
    .upload(filePath, blob, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("[snapdb] Error uploading image:", error);
    throw new Error(`Falha ao fazer upload da imagem: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('snap-immobile-photos')
    .getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    console.error("[snapdb] Failed to get public URL for image:", filePath);
    throw new Error("Falha ao obter URL pública da imagem.");
  }
  console.log("[snapdb] Image uploaded and public URL obtained:", publicUrlData.publicUrl);
  return publicUrlData.publicUrl;
}

export async function upgradePlan(userId: string, plan: UserPlan) {
  console.log("[snapdb] Upgrading plan for user:", userId, "to", plan);
  if (!hasSupabase) throw new Error("Supabase não configurado. Não é possível fazer upgrade do plano.");

  const { error } = await supabase.from("profiles").update({ plan }).eq("id", userId);
  if (error) {
    console.error("[snapdb] Error upgrading plan:", error);
    throw new Error(error.message);
  }
  console.log("[snapdb] Plan upgraded successfully for user:", userId);
}