import type { User, UserPlan, UserRole } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";

export const planLimits: Record<UserPlan, { hdrPerMonth: number }> = {
  free: { hdrPerMonth: 15 },
  pro: { hdrPerMonth: 999999 },
};

export async function getProfile(userId: string) {
  console.log(`[profileService] Fetching profile for userId: ${userId}`);
  // Removemos updated_at/created_at da seleção para evitar erros de coluna inexistente
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, cpf, company, role, plan, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profileService] Error fetching profile:", error);
    throw error;
  }
  return data;
}

export async function upsertProfile(input: {
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
  console.log("[profileService] Upserting profile for user:", input.id);
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
    // Deixamos o banco de dados gerenciar as datas automaticamente
  });
  if (error) {
    console.error("[profileService] Error during profile upsert:", error);
    throw error;
  }
}

export async function upgradePlan(userId: string, plan: UserPlan) {
  const { error } = await supabase.from("profiles").update({ plan }).eq("id", userId);
  if (error) throw new Error(error.message);
}