import { Suspense } from "react";
import { connection } from "next/server";
import { DiscoverView } from "@/components/discover/discover-view";
import { getDiscoveryDb } from "@/server/discovery/db";
import { listDiscoveryItems } from "@/server/discovery/core";

export const metadata = { title: "Discover rooms (prototype)", robots: { index: false } };

/** Prototype of real-world discovery (docs/web/DISCOVERY-FEASIBILITY.md). Reads the Neon dev branch only. */
export default function DiscoverPage() {
  return (
    <Suspense fallback={<main id="main" className="be-contours flex-1" aria-busy="true" />}>
      <Discover />
    </Suspense>
  );
}

async function Discover() {
  await connection();
  const db = getDiscoveryDb();
  if (!db) {
    return (
      <main id="main" className="flex-1 p-8">
        <p className="max-w-[52ch] text-body text-ink-2">The discovery prototype needs its test database (DISCOVERY_DATABASE_URL). It is not connected here.</p>
      </main>
    );
  }
  const now = new Date();
  const items = await listDiscoveryItems(db, now, { includeUnreviewedDirectory: true });
  return <DiscoverView items={items} generatedAt={now.toISOString()} />;
}
