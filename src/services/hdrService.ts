import { startOfMonth } from "date-fns";
import type { HDRSession, PhotoMode } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";
import { dataUrlToBlob } from "@/lib/fileActions";
import { getMimeType } from "@/utils/helpers";
import { getCurrentUser } from "@/services/authService";
import { planLimits } from "@/services/profileService";

export async function listSessions(propertyId: string): Promise<HDRSession[]> {
  console.log("[hdrService] Listing sessions for property:", propertyId);
  const { data, error } = await supabase
    .from("hdr_sessions")
    .select("id, property_id, images_count, hdr_image_url, status, error_message, created_at, mode")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[hdrService] Error listing sessions:", error);
    throw new Error(error.message);
  }
  console.log("[hdrService] Sessions listed:", data?.length);
  return (
    data?.map((s) => ({
      id: s.id,
      propertyId: s.property_id,
      imagesCount: s.images_count,
      hdrImageUrl: s.hdr_image_url ?? undefined,
      status: s.status,
      errorMessage: s.error_message ?? undefined,
      createdAt: s.created_at,
      mode: (s.mode as PhotoMode) ?? undefined,
    })) ?? []
  );
}

export async function canCreateHdrSession(userId: string): Promise<{
  ok: boolean;
  usedThisMonth: number;
  limitThisMonth: number;
}> {
  console.log("[hdrService] Checking HDR session limit for user:", userId);
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
    console.error("[hdrService] Error checking HDR session count:", error);
    throw new Error(error.message);
  }
  const usedThisMonth = count ?? 0;
  console.log(`[hdrService] HDR sessions used this month: ${usedThisMonth}/${limitThisMonth}`);
  return { ok: usedThisMonth < limitThisMonth, usedThisMonth, limitThisMonth };
}

export async function createHdrSession(args: {
  userId: string;
  propertyId: string;
  imagesCount: number;
  mode: PhotoMode;
  id?: string;
}): Promise<HDRSession> {
  console.log("[hdrService] Creating HDR session for property:", args.propertyId);
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
    console.error("[hdrService] Error creating HDR session:", error);
    throw new Error(error.message);
  }
  console.log("[hdrService] HDR session created:", data.id);
  return {
    id: data.id,
    propertyId: data.property_id,
    imagesCount: data.images_count,
    hdrImageUrl: data.hdr_image_url ?? undefined,
    status: data.status,
    errorMessage: data.error_message ?? undefined,
    createdAt: data.created_at,
    mode: (data.mode as PhotoMode) ?? undefined,
  };
}

export async function updateHdrSession(sessionId: string, patch: Partial<HDRSession>) {
  console.log("[hdrService] Updating HDR session:", sessionId, patch);
  const mapped: Record<string, unknown> = {};
  if (typeof patch.status !== "undefined") mapped.status = patch.status;
  if (typeof patch.hdrImageUrl !== "undefined") mapped.hdr_image_url = patch.hdrImageUrl;
  if (typeof patch.errorMessage !== "undefined") mapped.error_message = patch.errorMessage;
  if (typeof patch.mode !== "undefined") mapped.mode = patch.mode;

  const { error } = await supabase.from("hdr_sessions").update(mapped).eq("id", sessionId);
  if (error) {
    console.error("[hdrService] Error updating HDR session:", error);
    throw new Error(error.message);
  }
  console.log("[hdrService] HDR session updated:", sessionId);
}

export async function uploadHdrImage(userId: string, sessionId: string, base64Image: string): Promise<string> {
  console.log("[hdrService] Uploading HDR image for session:", sessionId);
  const blob = dataUrlToBlob(base64Image);
  const mimeType = getMimeType(base64Image);
  const filePath = `${userId}/${sessionId}.${mimeType.split("/")[1] || "jpeg"}`;

  const { error } = await supabase.storage.from("snap-immobile-photos").upload(filePath, blob, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error("[hdrService] Error uploading image:", error);
    throw new Error(`Falha ao fazer upload da imagem: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from("snap-immobile-photos").getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    console.error("[hdrService] Failed to get public URL for image:", filePath);
    throw new Error("Falha ao obter URL pública da imagem.");
  }
  console.log("[hdrService] Image uploaded and public URL obtained:", publicUrlData.publicUrl);
  return publicUrlData.publicUrl;
}