import type { Property, PropertyStatus } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";

export async function listProperties(userId: string): Promise<Property[]> {
  console.log("[propertyService] Listing properties for user:", userId);
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, user_id, title, address_full, city, district, postal_code, geo_lat, geo_lng, status, description, created_at, name, address",
    )
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
      title: p.title ?? p.name ?? "",
      addressFull: p.address_full ?? p.address ?? "",
      city: p.city ?? undefined,
      district: p.district ?? undefined,
      postalCode: p.postal_code ?? undefined,
      geoLat: typeof p.geo_lat === "number" ? p.geo_lat : undefined,
      geoLng: typeof p.geo_lng === "number" ? p.geo_lng : undefined,
      status: (p.status as PropertyStatus) ?? "draft",
      description: p.description ?? "",
      createdAt: p.created_at,
    })) ?? []
  );
}

export async function getProperty(propertyId: string): Promise<Property | null> {
  console.log("[propertyService] Getting property:", propertyId);
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, user_id, title, address_full, city, district, postal_code, geo_lat, geo_lng, status, description, created_at, name, address",
    )
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    console.error("[propertyService] Error getting property:", error);
    throw new Error(error.message);
  }
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title ?? data.name ?? "",
    addressFull: data.address_full ?? data.address ?? "",
    city: data.city ?? undefined,
    district: data.district ?? undefined,
    postalCode: data.postal_code ?? undefined,
    geoLat: typeof data.geo_lat === "number" ? data.geo_lat : undefined,
    geoLng: typeof data.geo_lng === "number" ? data.geo_lng : undefined,
    status: (data.status as PropertyStatus) ?? "draft",
    description: data.description ?? "",
    createdAt: data.created_at,
  };
}

export async function createPropertyDraft(args: {
  userId: string;
  title: string;
  addressFull: string;
  city?: string;
  district?: string;
  postalCode?: string;
  geoLat?: number;
  geoLng?: number;
}): Promise<Property> {
  console.log("[propertyService] Creating property draft:", args.title);

  // Importante: a tabela antiga ainda tem NOT NULL em name/address.
  // Mantemos compatibilidade preenchendo name/address com title/address_full.
  const { data, error } = await supabase
    .from("properties")
    .insert({
      user_id: args.userId,
      // colunas antigas
      name: args.title,
      address: args.addressFull,
      // colunas novas
      title: args.title,
      address_full: args.addressFull,
      city: args.city ?? null,
      district: args.district ?? null,
      postal_code: args.postalCode ?? null,
      geo_lat: typeof args.geoLat === "number" ? args.geoLat : null,
      geo_lng: typeof args.geoLng === "number" ? args.geoLng : null,
      status: "draft",
    })
    .select(
      "id, user_id, title, address_full, city, district, postal_code, geo_lat, geo_lng, status, description, created_at, name, address",
    )
    .single();

  if (error) {
    console.error("[propertyService] Error creating property draft:", error);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title ?? data.name ?? "",
    addressFull: data.address_full ?? data.address ?? "",
    city: data.city ?? undefined,
    district: data.district ?? undefined,
    postalCode: data.postal_code ?? undefined,
    geoLat: typeof data.geo_lat === "number" ? data.geo_lat : undefined,
    geoLng: typeof data.geo_lng === "number" ? data.geo_lng : undefined,
    status: (data.status as PropertyStatus) ?? "draft",
    description: data.description ?? "",
    createdAt: data.created_at,
  };
}

// Backwards-compat: antiga assinatura usada no app (name/address). Mantemos funcionando.
export async function createProperty(args: {
  userId: string;
  name: string;
  address: string;
  description?: string;
}): Promise<Property> {
  return createPropertyDraft({
    userId: args.userId,
    title: args.name,
    addressFull: args.address,
  });
}

export async function deleteProperty(propertyId: string) {
  console.log("[propertyService] Deleting property:", propertyId);
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) {
    console.error("[propertyService] Error deleting property:", error);
    throw new Error(error.message);
  }
  console.log("[propertyService] Property deleted:", propertyId);
}