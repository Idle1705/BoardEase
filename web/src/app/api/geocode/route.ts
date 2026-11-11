import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

/*
 * Place search for the location box.
 * Development uses OpenStreetMap's Nominatim, whose usage policy allows light use only
 * (max 1 request/second, no autocomplete, identify the app). The client calls this route
 * only when the visitor submits a search, and responses are cached for a day.
 * Before launch, switch GEOCODER_URL to a paid or self-hosted geocoder.
 */
const query = z.string().trim().min(2).max(100);

// Davao City region, preferred but not exclusive
const VIEWBOX = "125.20,7.40,125.75,6.90";

export async function GET(req: NextRequest) {
  const parsed = query.safeParse(req.nextUrl.searchParams.get("q"));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type at least two letters of a place." }, { status: 400 });
  }
  const base = process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";
  const url = new URL(base);
  url.searchParams.set("q", parsed.data);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "ph");
  url.searchParams.set("viewbox", VIEWBOX);
  url.searchParams.set("accept-language", "en");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": process.env.GEOCODER_USER_AGENT ?? "BoardEase/0.1 (rental search, development)" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows = (await res.json()) as { place_id: number; lat: string; lon: string; name?: string; display_name: string }[];
    const results = rows.map((r) => {
      const parts = r.display_name.split(", ");
      return {
        id: String(r.place_id),
        label: r.name || parts[0],
        detail: parts.slice(1, 4).join(", "),
        lat: Number(r.lat),
        lng: Number(r.lon),
      };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Place search is not responding. Pick a suggestion or move the map instead." },
      { status: 502 },
    );
  }
}
