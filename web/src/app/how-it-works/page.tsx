import { FinalCta, HowItWorks } from "@/components/landing/landing-page";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <main id="main" className="flex-1 overflow-y-auto overflow-x-clip bg-porcelain">
      {/* One daylight field behind the title and the steps, so the light never ends in a seam */}
      <div className="be-daylight">
      <header>
        <div className="mx-auto max-w-[1240px] px-5 pt-16 pb-14 sm:px-8 sm:pt-20 lg:px-10">
          <h1 className="max-w-[16ch] font-display text-display font-semibold text-balance text-ink">How BoardEase works</h1>
          <p className="mt-6 max-w-[40rem] text-lead text-ink-2">
            One place for renters to find a room in Davao City, and for owners to fill rooms and keep track of every bed.
          </p>
        </div>
      </header>
      <HowItWorks titled={false} />
      </div>
      <section aria-labelledby="privacy-title" className="bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-10">
          <h2 id="privacy-title" className="font-display text-section font-semibold text-balance text-ink lg:col-span-5">
            What stays private
          </h2>
          <div className="flex flex-col gap-4 text-prose text-ink-2 lg:col-span-6 lg:col-start-7">
            <p>The map shows only the approximate area of a room. The exact address is shared after a viewing is agreed.</p>
            <p>Tenant names, contact numbers, bills and payments are visible to the owner alone.</p>
            <p className="text-body text-subtle">BoardEase is in development. The listings on the map today are demonstrations.</p>
          </div>
        </div>
      </section>
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
