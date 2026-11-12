import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight } from "lucide-react";
import { LogOutButton } from "./log-out-button";
import { getOwnerInventory } from "@/server/owner";
import { getCurrentUser } from "@/server/profiles";

export const metadata = { title: "Your account" };

const ROLE_LABEL = { renter: "Renter", owner: "Property owner", admin: "Administrator" } as const;

export default function AccountPage() {
  return (
    <main id="main" className="be-contours flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[640px] px-4 py-10 sm:py-14">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
          <AccountDetails />
        </Suspense>
      </div>
    </main>
  );
}

async function AccountDetails() {
  await connection(); // per-request: never prerender someone's account
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/account");
  // Owners get a real way into the portal, with what is already in it (counted from their own records)
  const inventory = user.role === "owner" || user.role === "admin" ? await getOwnerInventory(user.id) : [];
  const rooms = inventory.reduce((n, p) => n + p.rooms.length, 0);
  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2">
        <h1 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink">Your account</h1>
        <p className="mt-1.5 text-body text-ink-2">Signed in as {user.name.split(" ")[0]}.</p>
      </header>

      <section aria-labelledby="next-title" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        {user.role === "owner" || user.role === "admin" ? (
          <>
            <h2 id="next-title" className="text-title3 font-semibold text-ink">Your properties</h2>
            <p className="mt-1.5 text-body text-ink-2">
              {inventory.length
                ? `${inventory.length} ${inventory.length === 1 ? "property" : "properties"} and ${rooms} ${rooms === 1 ? "room" : "rooms"} in your owner portal.`
                : "Add your first building in the owner portal, then its rooms and beds."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/owner/dashboard" className="inline-flex h-11 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]">
                Open the owner portal <ArrowRight className="size-4" strokeWidth={2.2} />
              </Link>
              <Link href="/find" className="inline-flex h-11 items-center rounded-md px-4 text-body font-medium text-ink ring-1 ring-ink/15 transition-[background-color,scale] duration-150 hover:bg-surface active:scale-[0.97]">
                Browse rooms
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 id="next-title" className="text-title3 font-semibold text-ink">Find a room</h2>
            <p className="mt-1.5 text-body text-ink-2">Search the map near your school or work. Rooms you save stay on this device for now.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/find" className="inline-flex h-11 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]">
                Browse rooms <ArrowRight className="size-4" strokeWidth={2.2} />
              </Link>
              <Link href="/saved" className="inline-flex h-11 items-center rounded-md px-4 text-body font-medium text-ink ring-1 ring-ink/15 transition-[background-color,scale] duration-150 hover:bg-surface active:scale-[0.97]">
                Saved rooms
              </Link>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="details-title" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <h2 id="details-title" className="text-callout font-semibold text-ink">Account details</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-body">
          <dt className="text-subtle">Name</dt>
          <dd className="text-ink">{user.name}</dd>
          <dt className="text-subtle">Email</dt>
          <dd className="break-all text-ink">{user.email}</dd>
          <dt className="text-subtle">Account type</dt>
          <dd className="text-ink">{ROLE_LABEL[user.role]}</dd>
        </dl>
      </section>


      <div>
        <LogOutButton />
      </div>
    </div>
  );
}
