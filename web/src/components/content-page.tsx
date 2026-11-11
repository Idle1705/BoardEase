import { SiteFooter } from "./site-footer";

export function ContentPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-porcelain">
      <div className="be-daylight">
        <div className="mx-auto max-w-[760px] px-5 py-14 sm:px-8 sm:py-20">
          <h1 className="font-display text-section font-semibold text-balance text-ink">{title}</h1>
          {intro && <p className="mt-5 max-w-[60ch] text-lead text-ink-2">{intro}</p>}
          <div className="mt-12 flex flex-col gap-10 text-prose text-ink-2">{children}</div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
