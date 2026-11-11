import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser, type CurrentUser } from "@/server/profiles";

/**
 * Server-side gate for owner pages: signed-in owners (or admins) only. The proxy already sends
 * signed-out visitors to /sign-in; this checks the role from our database.
 */
export async function OwnerGate({ next, children }: { next: string; children: (user: CurrentUser) => React.ReactNode }) {
  await connection(); // per-request: never prerender someone's records
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (user.role !== "owner" && user.role !== "admin") {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-title2 font-semibold text-ink">This area is for property owners</h1>
        <p className="mt-2 max-w-[52ch] text-body text-ink-2">
          Your account is a renter account. Owner tools are for people who rent out rooms. To list a property, create a
          separate owner account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/find" className="inline-flex h-11 items-center rounded-md bg-ink px-4 text-body font-medium text-white hover:bg-ink-2">
            Back to finding a room
          </Link>
          <Link href="/owners" className="inline-flex h-11 items-center rounded-md px-4 text-body font-medium text-ink ring-1 ring-ink/15 hover:bg-surface">
            About owner accounts
          </Link>
        </div>
      </div>
    );
  }
  return <>{children(user)}</>;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <div className="h-9 w-56 animate-pulse rounded-md bg-limestone/60" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
    </div>
  );
}
