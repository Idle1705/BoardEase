import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** Server-only Neon client. DATABASE_URL never reaches the browser. */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.");
  return drizzle(neon(url), { schema });
}

export { schema };
