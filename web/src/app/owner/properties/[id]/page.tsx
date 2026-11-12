import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import type { CurrentUser } from "@/server/profiles";
import { getDb, schema } from "@/server/db";
import { getOwnerListing, MarketError } from "@/server/marketplace/core";
import { photoUrl, storageConfigured } from "@/server/storage";
import { OwnerGate, PageSkeleton } from "../../gate";
import { RoomForm } from "../../forms";
import { FreeBeds, PageTitle, Panel } from "../../ui";
import { DetailsForm, PhotoManager, PublishPanel, RoomsEditor } from "../../listing-editor";

export const metadata = { title: "Property" };

// A private page per property id: render it per request instead of prerendering a shell,
// so the shared header and owner nav can read the URL without a Suspense fallback.
export const instant = false;

export default function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PropertyLoader params={params} />
    </Suspense>
  );
}

async function PropertyLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerGate next={`/owner/properties/${id}`}>{(user) => <Property user={user} id={id} />}</OwnerGate>;
}

async function Property({ user, id }: { user: CurrentUser; id: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = getDb();
  let data;
  try {
    // Scoped to this owner: another owner's property id is simply "not found"
    data = await getOwnerListing(db, { id: user.id, role: user.role }, id);
  } catch (e) {
    if (e instanceof MarketError) notFound();
    throw e;
  }
  const { property: p, listing: l, rooms, photos, checklist } = data;
  const [me] = await db.select({ phone: schema.profiles.phone }).from(schema.profiles).where(eq(schema.profiles.userId, user.id)).limit(1);
  const now = new Date();
  const free = rooms.reduce((n, r) => n + r.free, 0);
  const total = rooms.reduce((n, r) => n + r.total, 0);

  return (
    <>
      <Link href="/owner/properties" className="mb-4 inline-flex h-10 items-center gap-1 text-footnote font-medium text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" /> My Properties
      </Link>
      <PageTitle title={p.name} intro={`${p.street}, ${p.district}, ${p.city}`} action={total > 0 ? <FreeBeds free={free} capacity={total} /> : undefined} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <div className="flex flex-col gap-6">
          <Panel title="Rooms, rent and availability">
            <RoomsEditor propertyId={p.id} rooms={rooms} />
          </Panel>
          <Panel title="Listing details">
            <DetailsForm
              propertyId={p.id}
              hasPhone={!!me?.phone}
              initial={{
                title: l?.title ?? p.name,
                type: l?.type ?? "boarding-house",
                description: l?.description ?? "",
                amenities: l?.amenities ?? [],
                furnished: l?.furnished ?? false,
                bathroom: l?.bathroom ?? "shared",
                utilitiesNote: l?.utilitiesNote ?? "",
                minimumStayMonths: l?.minimumStayMonths ?? 1,
                showPhone: l?.showPhone ?? false,
              }}
            />
          </Panel>
          <Panel title="Photos">
            {storageConfigured() ? (
              <PhotoManager
                propertyId={p.id}
                rooms={rooms.map((r) => ({ id: r.id, label: r.label }))}
                photos={photos.map((ph) => ({ id: ph.id, url: photoUrl(ph.key), alt: ph.alt, width: ph.width, height: ph.height, roomId: ph.roomId }))}
              />
            ) : (
              <p className="text-body text-ink-2">Photo storage isn&apos;t set up on this server yet.</p>
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Listing status">
            <PublishPanel
              propertyId={p.id}
              listingId={l?.id ?? null}
              status={l?.status ?? null}
              reviewNote={l?.reviewNote ?? null}
              checklist={checklist}
              confirmedDays={l?.availabilityConfirmedAt ? Math.floor((now.getTime() - l.availabilityConfirmedAt.getTime()) / 86_400_000) : null}
              freeSpaces={free}
            />
          </Panel>
          <Panel title="Add a room">
            <RoomForm propertyId={p.id} />
          </Panel>
        </div>
      </div>
    </>
  );
}
