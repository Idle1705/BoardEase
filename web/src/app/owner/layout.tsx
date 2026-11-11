import { OwnerNav } from "./owner-nav";

export const metadata = { title: { default: "Owner portal", template: "%s | Owner portal | BoardEase" } };

// Calm, functional surface: white chrome, a faint Porcelain work area, no decorative background.
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <OwnerNav />
      <main id="main" className="min-w-0 flex-1 overflow-y-auto bg-[#fbfaf7]">
        <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
