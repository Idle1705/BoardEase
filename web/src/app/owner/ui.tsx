import { formatPeso } from "@/lib/format";
import type { RoomRow } from "@/server/owner";
import { cn } from "@/lib/utils";

export function PageTitle({ title, intro, action }: { title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {intro && <p className="mt-1.5 max-w-[60ch] text-body text-ink-2">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 shadow-sm sm:p-6", className)}>
      {title && <h2 className="mb-4 text-callout font-semibold text-ink">{title}</h2>}
      {children}
    </section>
  );
}

const KIND = { single: "Single", shared: "Shared", unit: "Whole unit" } as const;

/** Free beds in Garden Green only when there really are free beds (real tenancy data). */
export function FreeBeds({ free, capacity }: { free: number; capacity: number }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[4.5rem] justify-center rounded-md px-2 py-0.5 text-footnote font-semibold tabular-nums",
        free > 0 ? "bg-garden-soft text-garden-ink" : "bg-surface text-subtle",
      )}
    >
      {free} of {capacity} free
    </span>
  );
}

export function RoomsTable({ rooms, showProperty }: { rooms: (RoomRow & { propertyName?: string })[]; showProperty?: boolean }) {
  return (
    // Focusable so keyboard users can scroll it sideways on a phone
    <div className="-mx-5 overflow-x-auto sm:mx-0" tabIndex={0} role="region" aria-label="Rooms table">
      <table className="w-full min-w-[560px] text-left text-body">
        <thead>
          <tr className="border-b border-limestone text-footnote text-subtle">
            {showProperty && <th scope="col" className="px-5 pb-2.5 font-medium sm:px-0">Property</th>}
            <th scope="col" className={cn("pb-2.5 font-medium", showProperty ? "pl-4" : "px-5 sm:px-0")}>Room</th>
            <th scope="col" className="pb-2.5 pl-4 font-medium">Type</th>
            <th scope="col" className="pb-2.5 pl-4 text-right font-medium">Rent / month</th>
            <th scope="col" className="pb-2.5 pl-4 text-right font-medium">Occupied</th>
            <th scope="col" className="pr-5 pb-2.5 pl-4 text-right font-medium sm:pr-0">Availability</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rooms.map((r) => (
            <tr key={r.id} data-row-id={r.id} className="border-b border-limestone/70 last:border-0">
              {showProperty && <td className="px-5 py-3 text-ink-2 sm:px-0">{r.propertyName}</td>}
              <th scope="row" className={cn("py-3 font-medium text-ink", showProperty ? "pl-4" : "px-5 sm:px-0")}>{r.label}</th>
              <td className="py-3 pl-4 text-ink-2">{KIND[r.kind]}</td>
              <td className="py-3 pl-4 text-right text-ink">
                {formatPeso(r.rentCents / 100)}
                {r.kind === "shared" && <span className="text-footnote text-subtle"> / bed</span>}
              </td>
              <td className="py-3 pl-4 text-right text-ink-2">{r.occupied}</td>
              <td className="py-3 pr-5 pl-4 text-right sm:pr-0">
                <FreeBeds free={r.free} capacity={r.capacity} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
