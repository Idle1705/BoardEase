import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { getDb, schema } from "./db";

export type Role = (typeof schema.userRole.enumValues)[number];

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * The signed-in user with their BoardEase role, or null.
 * Creates a renter profile on first sight if one is missing (e.g. a user added in the Neon Console).
 * Roles are read from our database, never from anything the browser sends.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const db = getDb();
  let [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id)).limit(1);
  if (!profile) {
    [profile] = await db
      .insert(schema.profiles)
      .values({ userId: user.id, displayName: user.name || user.email, role: "renter" })
      .onConflictDoNothing()
      .returning();
    profile ??= (await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id)).limit(1))[0];
  }
  return { id: user.id, name: profile?.displayName ?? user.name, email: user.email, role: profile?.role ?? "renter" };
}

/** Called right after sign-up. Only renter or owner can be chosen; admin is granted by hand. */
export async function createProfile(userId: string, displayName: string, role: "renter" | "owner") {
  await getDb().insert(schema.profiles).values({ userId, displayName, role }).onConflictDoNothing();
}

/** Throws unless the signed-in user has one of the roles. Use at the top of every private server action. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in first.");
  if (!roles.includes(user.role)) throw new Error("You don't have access to this.");
  return user;
}
