import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";

/**
 * The discovery prototype reads and writes the Neon DEV branch (`discovery-dev`, a copy of main).
 * It refuses to run against main until the owner approves applying migration 0001 there.
 */
export function getDiscoveryDb() {
  const url = process.env.DISCOVERY_DATABASE_URL;
  if (!url) return null;
  if (url === process.env.DATABASE_URL) throw new Error("Discovery prototype must not use the main database yet.");
  return drizzle(neon(url), { schema });
}

export type DiscoveryDb = NonNullable<ReturnType<typeof getDiscoveryDb>>;
