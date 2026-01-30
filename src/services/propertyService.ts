import type { Property } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";

export async function listProperties(userId: string): Promise<Property[]> {
  console.log("[propertyService] Listing properties for user:", userId);
  const { data, error } = await supabase
    .from("properties")
    .select("id, user_id, name, address, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[propertyService] Error listing properties:", error);
    throw new Error(error.message);
  }
  console.log("[propertyService] Properties listed:", data?.length);
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
  console.log("[propertyService] Getting property:", propertyId);
  const { data, error } = await supabase
    .from("properties")
    .select("id, user_id, name, address, description, created_at")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    console.error("[propertyService] Error getting property:", error);
    throw new Error(error.message);
  }
  console.log("[propertyService] Property data:", data ? data.name : "null");
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
  console.log("[propertyService] Creating property:", args.name);
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
    console.error("[propertyService] Error creating property:", error);
    throw new Error(error.message);
  }
  console.log("[propertyService] Property created:", data.id);
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    address: data.address,
    description: data.description ?? "",
    createdAt: data.created_at,
  };
}