import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";

/*
 * Neon Auth (managed Better Auth). Users, sessions and passwords live in the `neon_auth`
 * schema of our Neon database, managed by Neon. Our own `profiles` table holds the role.
 * Env: NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET (32+ chars). Never exposed to the browser.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
