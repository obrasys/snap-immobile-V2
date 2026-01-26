export type UserRole = "corretor" | "proprietario" | "fotografo" | "outro";
export type UserPlan = "free" | "pro";

export type User = {
  id: string;
  name: string;
  email: string;
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

export type HDRSession = {
  id: string;
  propertyId: string;
  imagesCount: number;
  hdrImageDataUrl?: string;
  status: HDRSessionStatus;
  errorMessage?: string;
  createdAt: string; // ISO
};
