import { Suspense } from "react";
import Link from "next/link";
import { getOwnerInventory } from "@/server/owner";
import { OwnerGate, PageSkeleton } from "../gate";
import { PageTitle, Panel, RoomsTable } from "../ui";

export const metadata = { title: "Rooms & Availability" };

export default function RoomsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OwnerGate next="/owner/rooms">{(user) => <Rooms ownerId={user.id} />}</OwnerGate>
    </Suspense>
  );
}

async function Rooms({ ownerId }: { ownerId: string }) {
  const props = await getOwnerInventory(ownerId);
  const rooms = props.flatMap((p) => p.rooms.map((r) => ({ ...r, propertyName: p.name })));
  const free = rooms.reduce((a, r) => a + r.free, 0);
  const beds = rooms.reduce((a, r) => a + r.capacity, 0);
  return (
    <>
      <PageTitle
        title="Rooms & Availability"
        intro="Availability is counted per bed from your current tenants. A full room never hides the free beds elsewhere."
      />
      <Panel title={rooms.length ? `${free} of ${beds} beds free across ${rooms.length} ${rooms.length === 1 ? "room" : "rooms"}` : "No rooms yet"}>
        {rooms.length ? (
          <RoomsTable rooms={rooms} showProperty />
        ) : (
          <p className="text-body text-ink-2">
            Rooms are added inside a property.{" "}
            <Link href="/owner/properties" className="font-medium text-clay underline underline-offset-2">
              Go to My Properties
            </Link>
            .
          </p>
        )}
        <p className="mt-5 text-footnote text-subtle">
          Occupied beds come from tenant records. Adding and moving tenants arrives with the Tenants module.
        </p>
      </Panel>
    </>
  );
}
