import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Only needed for `drizzle-kit migrate` / `push`; `generate` works offline.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Neon Auth owns this schema; never let migrations touch it
  schemaFilter: ["public"],
});
