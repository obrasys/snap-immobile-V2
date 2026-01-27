import { startOfMonth } from "date-fns";
import type { HDRSession, Property, User, UserPlan, UserRole } from "@/lib/models";
import { hasSupabase, supabase } from "@/lib/supabaseClient";
import * as local from "@/lib/snapdb.local";

function nowIso() {
  return new Date().toISOString();
}

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, last_name, email, phone, cpf, company, role, plan, photo_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertProfile(input: {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  cpf?: string;
  company?: string;
  role: UserRole;
  plan: UserPlan;
  photoUrl?: string;
}) {
  const { error } = await supabase.from("profiles").upsert({
    id: input.id,
    name: input.name,
    last_name: input.lastName ?? "",
    email: input.email,
    phone: input.phone ?? "",
    cpf: input.cpf ?? "",
    company: input.company ?? "",
    role: input.role,
    plan: input.plan,
    photo_url: input.photoUrl ?? "",
    created_at: nowIso(),
  });
  if (error) throw error;
}

export const planLimits: Record<UserPlan, { hdrPerMonth: number }> = {
  free: { hdrPerMonth: 15 },
  pro: { hdrPerMonth: 999999 },
};

export async function getCurrentUser(): Promise<User | null> {
  if (!hasSupabase) return local.getCurrentUser();

  const { data } = await supabase.auth.getUser();
  const au = data.user;
  if (!au) return null;

  const email = au.email ?? "";
  const avatar = (au.user_metadata as Record<string, unknown> | null)?.avatar_url;

  const existing = await getProfile(au.id).catch(() => null);
  if (!existing) {
    await upsertProfile({
      id: au.id,
      name: (au.user_metadata as any)?.full_name || "Usuário",
      lastName: "",
      email,
      phone: "",
      cpf: "",
      company: "",
      role: "corretor",
      plan: "free",
      photoUrl: typeof avatar === "string" ? avatar : "",
    });
  }

  const profile = await getProfile(au.id);

  return {
    id: au.id,
    name: profile?.name ?? (au.user_metadata as any)?.full_name ?? "Usuário",
    lastName: profile?.last_name ?? "",
    email: profile?.email ?? email,
    phone: profile?.phone ?? "",
    cpf: profile?.cpf ?? "",
    company: profile?.company ?? "",
    role: (profile?.role as UserRole) ?? "corretor",
    plan: (profile?.plan as UserPlan) ?? "free",
    photoUrl: profile?.photo_url || (typeof avatar === "string" ? avatar : undefined),
    createdAt: profile?.created_at ?? nowIso(),
  };
}

export async function logout() {
  if (!hasSupabase) return local.logout();
  await supabase.auth.signOut();
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  if (!hasSupabase) return local.loginWithEmail(email, password);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const u = await getCurrentUser();
  if (!u) throw new Error("Falha ao carregar sessão");
  return u;
}

export async function loginWithGoogle(): Promise<void> {
  if (!hasSupabase) {
    // fallback: mantém demo local
    local.loginWithGoogleDemo();
    return;
  }

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
  phone?: string;
  cpf?: string;
  company?: string;
  password: string;
  role: UserRole;
}): Promise<User> {
  if (!hasSupabase) return local.registerWithEmail(args);

  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        full_name: `${args.name} ${args.lastName ?? ""}`.trim(),
      },
    },
  });
  if (error) throw new Error(error.message);
  const au = data.user;
  if (!au) throw new Error("Cadastro criado, mas usuário não retornou");

  await upsertProfile({
    id: au.id,
    name: args.name,
    lastName: args.lastName ?? "",
    email: args.email,
    phone: args.phone ?? "",
    cpf: args.cpf ?? "",
    company: args.company ?? "",
    role: args.role,
    plan: "free",
    photoUrl: "",
  });

  // Em projetos com confirmação de e-mail habilitada, a sessão pode não existir ainda.
  const u = await getCurrentUser();
  if (!u) {
    // fallback: devolve o perfil (permitindo o app seguir e o usuário confirmar depois)
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
  return u;
}

export async function requestPasswordReset(email: string) {
  if (!hasSupabase) return local.requestPasswordReset(email);

  const redirectTo = `${window.location.origin}/auth/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
  return true;
}

export async function listProperties(userId: string): Promise<Property[]> {
  if (!hasSupabase) return local.listProperties(userId);

  const { data, error } = await supabase
    .from("properties")
    .select("id, user_id, name, address, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

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
  if (!hasSupabase) return local.getProperty(propertyId);

  const { data, error } = await supabase
    .from("properties")
    .select("id, user_id, name, address, description, created_at")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
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
  if (!hasSupabase) return local.createProperty(args);

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

  if (error) throw new Error(error.message);

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
  if (!hasSupabase) return local.listSessions(propertyId);

  const { data, error } = await supabase
    .from("hdr_sessions")
    .select("id, property_id, images_count, hdr_image_data_url, status, error_message, created_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    data?.map((s) => ({
      id: s.id,
      propertyId: s.property_id,
      imagesCount: s.images_count,
      hdrImageDataUrl: s.hdr_image_data_url ?? undefined,
      status: s.status,
      errorMessage: s.error_message ?? undefined,
      createdAt: s.created_at,
    })) ?? []
  );
}

export async function canCreateHdrSession(userId: string): Promise<{
  ok: boolean;
  usedThisMonth: number;
  limitThisMonth: number;
}> {
  if (!hasSupabase) return local.canCreateHdrSession(userId);

  const user = await getCurrentUser();
  if (!user) return { ok: false, usedThisMonth: 0, limitThisMonth: 0 };

  const limitThisMonth = planLimits[user.plan].hdrPerMonth;
  const monthStart = startOfMonth(new Date()).toISOString();

  const { count, error } = await supabase
    .from("hdr_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  if (error) throw new Error(error.message);
  const usedThisMonth = count ?? 0;

  return { ok: usedThisMonth < limitThisMonth, usedThisMonth, limitThisMonth };
}

export async function createHdrSession(args: {
  userId: string;
  propertyId: string;
  imagesCount: number;
}): Promise<HDRSession> {
  if (!hasSupabase) return local.createHdrSession({ propertyId: args.propertyId, imagesCount: args.imagesCount });

  const { data, error } = await supabase
    .from("hdr_sessions")
    .insert({
      user_id: args.userId,
      property_id: args.propertyId,
      images_count: args.imagesCount,
      status: "processing",
    })
    .select("id, property_id, images_count, hdr_image_data_url, status, error_message, created_at")
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    propertyId: data.property_id,
    imagesCount: data.images_count,
    hdrImageDataUrl: data.hdr_image_data_url ?? undefined,
    status: data.status,
    errorMessage: data.error_message ?? undefined,
    createdAt: data.created_at,
  };
}

export async function updateHdrSession(sessionId: string, patch: Partial<HDRSession>) {
  if (!hasSupabase) return local.updateHdrSession(sessionId, patch);

  const mapped: Record<string, unknown> = {};
  if (typeof patch.status !== "undefined") mapped.status = patch.status;
  if (typeof patch.hdrImageDataUrl !== "undefined") mapped.hdr_image_data_url = patch.hdrImageDataUrl;
  if (typeof patch.errorMessage !== "undefined") mapped.error_message = patch.errorMessage;

  const { error } = await supabase.from("hdr_sessions").update(mapped).eq("id", sessionId);
  if (error) throw new Error(error.message);
}

export async function upgradePlan(userId: string, plan: UserPlan) {
  if (!hasSupabase) return local.upgradePlan(userId, plan);

  const { error } = await supabase.from("profiles").update({ plan }).eq("id", userId);
  if (error) throw new Error(error.message);
}
