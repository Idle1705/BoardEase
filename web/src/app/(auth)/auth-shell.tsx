import Image from "next/image";
import photo from "../../../public/editorial/bed-by-windows.jpg";

/*
 * Sign in / sign up. Desktop: the form on Porcelain with a quiet brand panel beside it, so the
 * moment of joining feels like BoardEase, not a generic auth card. Phone: the form alone, full width.
 * Editorial photo (Unsplash, public/editorial/MANIFEST.md), not a listing.
 */
export function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-porcelain">
      <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-[420px]">
            <h1 className="font-display text-[34px] leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-ink sm:text-[40px]">
              {title}
            </h1>
            <p className="mt-3 mb-8 text-callout text-ink-2">{intro}</p>
            {children}
          </div>
        </div>

        <div aria-hidden className="relative hidden p-4 lg:block">
          <div className="relative h-full min-h-[560px] overflow-hidden rounded-[28px]">
            <Image src={photo} alt="" fill priority placeholder="blur" sizes="50vw" className="object-cover" />
            {/* Deep Ink scrim only where the caption sits, so the photo stays bright */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-10">
              <span className="block h-1 w-10 rounded-full bg-clay" />
              <p className="mt-5 max-w-[22ch] font-display text-[30px] leading-[1.12] font-semibold tracking-[-0.015em] text-white">
                Rooms near where you study or work, with the rent up front.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
