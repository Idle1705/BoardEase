import { Suspense } from "react";
import { ExploreView } from "@/components/explore/explore-view";

export const metadata = {
  title: "Find a room",
  description: "Search bedspaces, dorms, boarding houses and apartments in Davao City by monthly rent, distance and room type.",
};

export default function FindPage() {
  return (
    <Suspense
      fallback={
        // Same landmark and heading as the finder, so the page is navigable while it loads
        <main id="main" className="be-contours flex flex-1 items-center justify-center" aria-busy="true">
          <h1 className="sr-only">Find a room</h1>
          <p className="rounded-full bg-white px-4 py-2 text-footnote text-ink-2 shadow-md">Loading the finder…</p>
        </main>
      }
    >
      <ExploreView />
    </Suspense>
  );
}
