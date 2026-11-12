import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { OwnerGate, PageSkeleton } from "../../gate";
import { getDiscoveryDb } from "@/server/discovery/db";
import { schema } from "@/server/db";
import { ClaimForm } from "../claim-form";

export const metadata = { title: "Claim a building" };

// Per-request page (same as owner/properties/[id]): the owner nav reads the URL.
export const instant = false;

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClaimLoader params={params} />
    </Suspense>
  );
}

async function ClaimLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerGate next={`/owner/claim/${id}`}>{() => <Claim building={id} />}</OwnerGate>;
}

async function Claim({ building }: { building: string }) {
  const db = getDiscoveryDb();
  const id = /^[0-9a-f-]{36}$/i.test(building ?? "") ? building! : null;
  const [b] = db && id ? await db.select().from(schema.buildings).where(eq(schema.buildings.id, id)).limit(1) : [];
  if (!b) {
    return <p className="text-body text-ink-2">Choose a building from the directory on the discover page first.</p>;
  }
  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <div>
        <h1 className="font-display text-title1 font-semibold text-ink">Claim {b.name}</h1>
        <p className="mt-2 text-body text-ink-2">
          {b.district}, {b.city}. After a moderator approves your claim, your rooms here can be listed with your own photos,
          prices and free beds.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <ClaimForm buildingId={b.id} />
      </div>
    </div>
  );
}
