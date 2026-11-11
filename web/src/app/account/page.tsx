import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LogOutButton } from "./log-out-button";
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
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-title2 font-semibold tracking-[-0.01em] text-ink">Hi, {user.name.split(" ")[0]}</h1>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-body">
          <dt className="text-subtle">Name</dt>
          <dd className="text-ink">{user.name}</dd>
          <dt className="text-subtle">Email</dt>
          <dd className="break-all text-ink">{user.email}</dd>
          <dt className="text-subtle">Account type</dt>
          <dd className="text-ink">{ROLE_LABEL[user.role]}</dd>
        </dl>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        {user.role === "owner" ? (
          <>
            <h2 className="text-callout font-semibold text-ink">Your properties</h2>
            <p className="mt-1 text-body text-ink-2">
              Adding properties, rooms and listings is the next part being built. Your account is ready for it.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-callout font-semibold text-ink">Find a room</h2>
            <p className="mt-1 text-body text-ink-2">Saved rooms still live on this device for now. Moving them to your account comes next.</p>
            <Link href="/find" className="mt-4 inline-flex h-11 items-center rounded-md bg-ink px-4 text-body font-medium text-white hover:bg-ink-2">
              Browse rooms
            </Link>
          </>
        )}
      </section>

      <div>
        <LogOutButton />
      </div>
    </div>
  );
}
