import { Suspense } from "react";
import Link from "next/link";
import { getOwnerInventory } from "@/server/owner";
import { OwnerGate, PageSkeleton } from "../gate";
import { PropertyForm } from "../forms";
import { FreeBeds, PageTitle, Panel } from "../ui";

export const metadata = { title: "My Properties" };

export default function PropertiesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OwnerGate next="/owner/properties">{(user) => <Properties ownerId={user.id} />}</OwnerGate>
    </Suspense>
  );
}

async function Properties({ ownerId }: { ownerId: string }) {
  const props = await getOwnerInventory(ownerId);
  return (
    <>
      <PageTitle title="My Properties" intro="Each building you rent rooms in. Renters only ever see the street and area." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <Panel title={props.length ? `${props.length} ${props.length === 1 ? "property" : "properties"}` : "No properties yet"}>
          {props.length ? (
            <ul className="divide-y divide-limestone">
              {props.map((p) => (
                <li key={p.id}>
                  <Link href={`/owner/properties/${p.id}`} className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-3.5 transition-colors hover:bg-surface">
                    <span className="min-w-0">
                      <span className="block text-body font-medium text-ink">{p.name}</span>
                      <span className="block text-footnote text-subtle">
                        {p.street}, {p.district}, {p.city} · {p.rooms.length} {p.rooms.length === 1 ? "room" : "rooms"}
                      </span>
                    </span>
                    <FreeBeds free={p.free} capacity={p.capacity} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-ink-2">Add your first property with the form. Then open it to add rooms and beds.</p>
          )}
        </Panel>
        <Panel title="Add a property">
          <PropertyForm />
        </Panel>
      </div>
    </>
  );
}
