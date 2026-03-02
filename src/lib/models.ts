export type UserRole = "corretor" | "proprietario" | "fotografo" | "outro";
export type UserPlan = "free" | "pro";

export type User = {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  cpf?: string;
  company?: string;
  photoUrl?: string;
  role: UserRole;
  plan: UserPlan;
  createdAt: string; // ISO
};

export type Property = {
  id: string;
  userId: string;
  name: string;
  address: string;
  description?: string;
  createdAt: string; // ISO
};

export type HDRSessionStatus = "processing" | "done" | "error";

export type PhotoMode = "hp_hdr_interior" | "hp_hdr_exterior" | "hp_hdr_window" | "hp_panorama";

export type HDRSession = {
  id: string;
  propertyId: string;
  imagesCount: number;
  hdrImageUrl?: string; // Renomeado de hdrImageDataUrl para hdrImageUrl
  status: HDRSessionStatus;
  errorMessage?: string;
  createdAt: string; // ISO
  mode?: PhotoMode; // Adicionado o modo da foto
};