import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

/* Signed-in areas. Everything else (the map, listings, content pages) stays public. */
const requireSignIn = auth.middleware({ loginUrl: "/sign-in" });

// Finder links from before the landing page existed (e.g. /?max=4000&km=1&view=map) carry these
// keys. They move to /find with every parameter intact, so bookmarks and shared links keep working.
const FINDER_KEYS = ["loc", "lat", "lng", "max", "km", "type", "sort", "id", "view"];

export default function proxy(request: NextRequest) {
  const url = request.nextUrl;
  if (url.pathname === "/") {
    if (FINDER_KEYS.some((k) => url.searchParams.has(k))) {
      const to = url.clone();
      to.pathname = "/find";
      return NextResponse.redirect(to, 308);
    }
    return NextResponse.next();
  }
  return requireSignIn(request);
}

export const config = {
  matcher: ["/", "/account/:path*", "/owner/:path*", "/admin/:path*", "/inquiries/:path*"],
};
