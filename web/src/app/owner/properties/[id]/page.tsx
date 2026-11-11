import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getOwnerInventory } from "@/server/owner";
import { OwnerGate, PageSkeleton } from "../../gate";
import { RoomForm } from "../../forms";
import { FreeBeds, PageTitle, Panel, RoomsTable } from "../../ui";

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
  return (
    <OwnerGate next={`/owner/properties/${id}`}>{(user) => <Property ownerId={user.id} id={id} />}</OwnerGate>
  );
}

async function Property({ ownerId, id }: { ownerId: string; id: string }) {
  // Only this owner's properties are loaded, so another owner's id simply isn't found
  const p = (await getOwnerInventory(ownerId)).find((x) => x.id === id);
  if (!p) notFound();
  return (
    <>
      <Link href="/owner/properties" className="mb-4 inline-flex h-10 items-center gap-1 text-footnote font-medium text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" /> My Properties
      </Link>
      <PageTitle
        title={p.name}
        intro={`${p.street}, ${p.district}, ${p.city}`}
        action={p.capacity > 0 ? <FreeBeds free={p.free} capacity={p.capacity} /> : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <Panel title="Rooms and beds">
          {p.rooms.length ? (
            <RoomsTable rooms={p.rooms} />
          ) : (
            <p className="text-body text-ink-2">No rooms yet. Add each room with how many beds it has; shared rooms are rented per bed.</p>
          )}
        </Panel>
        <Panel title="Add a room">
          <RoomForm propertyId={p.id} />
        </Panel>
      </div>
    </>
  );
}
