import { startOfMonth } from "date-fns";
import type { HDRSession, Property, User, UserPlan, UserRole } from "@/lib/models";
import { loadJson, saveJson } from "@/lib/storage";

type DbState = {
  users: Array<User & { password?: string }>;
  properties: Property[];
  sessions: HDRSession[];
  currentUserId?: string;
};

const DB_KEY = "snapimmobile.db.v1";

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID();
}

function readDb(): DbState {
  return loadJson<DbState>(DB_KEY, {
    users: [],
    properties: [],
    sessions: [],
    currentUserId: undefined,
  });
}

function writeDb(next: DbState) {
  saveJson(DB_KEY, next);
}

export const planLimits: Record<UserPlan, { hdrPerMonth: number }> = {
  free: { hdrPerMonth: 15 },
  pro: { hdrPerMonth: 999999 },
};

export function getCurrentUser(): User | null {
  const db = readDb();
  const u = db.users.find((x) => x.id === db.currentUserId);
  if (!u) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safe } = u;
  return safe;
}

export function logout() {
  const db = readDb();
  writeDb({ ...db, currentUserId: undefined });
}

export function loginWithEmail(email: string, password: string): User {
  const db = readDb();
  const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u || !u.password || u.password !== password) {
    throw new Error("E-mail ou senha inválidos");
  }
  writeDb({ ...db, currentUserId: u.id });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _p, ...safe } = u;
  return safe;
}

export function loginWithGoogleDemo(): User {
  const db = readDb();
  const email = `google.user.${Math.floor(Math.random() * 10000)}@demo.com`;
  const user: User = {
    id: uid(),
    name: "Conta Google (Demo)",
    lastName: "",
    email,
    phone: "",
    cpf: "",
    company: "",
    photoUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=SnapImmobile",
    role: "corretor",
    plan: "free",
    createdAt: nowIso(),
  };
  const next: DbState = {
    ...db,
    users: [user as User & { password?: string }, ...db.users],
    currentUserId: user.id,
  };
  writeDb(next);
  return user;
}

export function registerWithEmail(args: {
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  cpf?: string;
  company?: string;
  password: string;
  role: UserRole;
}): User {
  const db = readDb();
  const exists = db.users.some((x) => x.email.toLowerCase() === args.email.toLowerCase());
  if (exists) throw new Error("Já existe uma conta com este e-mail");

  const user: User & { password: string } = {
    id: uid(),
    name: args.name.trim(),
    lastName: args.lastName?.trim() || "",
    email: args.email.trim().toLowerCase(),
    phone: args.phone?.trim() || "",
    cpf: args.cpf?.trim() || "",
    company: args.company?.trim() || "",
    password: args.password,
    role: args.role,
    plan: "free",
    createdAt: nowIso(),
  };

  writeDb({ ...db, users: [user, ...db.users], currentUserId: user.id });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safe } = user;
  return safe;
}

export function requestPasswordReset(_email: string) {
  // demo: não envia e-mail; apenas simula sucesso
  return true;
}

export function listProperties(userId: string): Property[] {
  const db = readDb();
  return db.properties
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getProperty(propertyId: string): Property | null {
  const db = readDb();
  return db.properties.find((p) => p.id === propertyId) ?? null;
}

export function createProperty(args: {
  userId: string;
  name: string;
  address: string;
  description?: string;
}): Property {
  const db = readDb();
  const p: Property = {
    id: uid(),
    userId: args.userId,
    name: args.name.trim(),
    address: args.address.trim(),
    description: args.description?.trim() || "",
    createdAt: nowIso(),
  };
  writeDb({ ...db, properties: [p, ...db.properties] });
  return p;
}

export function listSessions(propertyId: string): HDRSession[] {
  const db = readDb();
  return db.sessions
    .filter((s) => s.propertyId === propertyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function canCreateHdrSession(userId: string): {
  ok: boolean;
  usedThisMonth: number;
  limitThisMonth: number;
} {
  const user = readDb().users.find((u) => u.id === userId);
  if (!user) return { ok: false, usedThisMonth: 0, limitThisMonth: 0 };

  const limitThisMonth = planLimits[user.plan].hdrPerMonth;
  const monthStart = startOfMonth(new Date()).toISOString();

  const db = readDb();
  const propertyIds = new Set(db.properties.filter((p) => p.userId === userId).map((p) => p.id));
  const usedThisMonth = db.sessions.filter(
    (s) => propertyIds.has(s.propertyId) && s.createdAt >= monthStart,
  ).length;

  return { ok: usedThisMonth < limitThisMonth, usedThisMonth, limitThisMonth };
}

export function createHdrSession(args: {
  propertyId: string;
  imagesCount: number;
}): HDRSession {
  const db = readDb();
  const s: HDRSession = {
    id: uid(),
    propertyId: args.propertyId,
    imagesCount: args.imagesCount,
    status: "processing",
    createdAt: nowIso(),
  };
  writeDb({ ...db, sessions: [s, ...db.sessions] });
  return s;
}

export function updateHdrSession(sessionId: string, patch: Partial<HDRSession>) {
  const db = readDb();
  writeDb({
    ...db,
    sessions: db.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
  });
}

export function upgradePlan(userId: string, plan: UserPlan) {
  const db = readDb();
  writeDb({
    ...db,
    users: db.users.map((u) => (u.id === userId ? { ...u, plan } : u)),
  });
}