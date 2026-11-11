import { auth } from "@/lib/auth/server";

/* Signed-in areas. Everything else (the map, listings, content pages) stays public. */
export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: ["/account/:path*", "/owner/:path*", "/admin/:path*"],
};
