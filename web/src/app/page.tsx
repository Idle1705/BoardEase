import { Suspense } from "react";
import { ExploreView } from "@/components/explore/explore-view";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-surface" aria-busy="true" />}>
      <ExploreView />
    </Suspense>
  );
}
