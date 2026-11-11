import { ContentPage } from "@/components/content-page";
import credits from "@/data/photo-credits.json";

export const metadata = { title: "Photo credits" };

// Mirrors public/editorial/MANIFEST.md. Editorial photos never stand for a listing.
const EDITORIAL = [
  ["Bedroom with a wooden wall and desk", "Aleksandra Dementeva", "https://unsplash.com/photos/laptop-on-desk-in-modern-bedroom-GzR2KS4ABYA"],
  ["Ochre apartment building among trees", "Devon Owens", "https://unsplash.com/photos/beige-concrete-building-near-trees-during-daytime-JVXcRDu1tVI"],
  ["Single bed by a window", "SR LEE", "https://unsplash.com/photos/cozy-bedroom-with-a-single-bed-and-window-view-5UuMPgXHekA"],
  ["Apartment block with trees and walkways", "Maverick Frame", "https://unsplash.com/photos/modern-apartment-complex-with-trees-and-paved-walkways-nXToxhXWJ_M"],
  ["Open-air residential corridor", "Prabal Kumar", "https://unsplash.com/photos/long-hallway-with-doors-and-outdoor-view-1L4OscrIr9Y"],
];

export default function Credits() {
  return (
    <ContentPage title="Photo credits" intro="Who took the photographs on BoardEase, and under which licence.">
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">Landing and owner pages</h2>
        <p>
          Editorial photos from Unsplash under the{" "}
          <a href="https://unsplash.com/license" className="underline" rel="noopener noreferrer">
            Unsplash License
          </a>
          . They set the scene and are not rooms listed on BoardEase.
        </p>
        <ul className="flex flex-col gap-2">
          {EDITORIAL.map(([what, by, href]) => (
            <li key={href}>
              <a href={href} className="font-medium text-ink underline underline-offset-2" rel="noopener noreferrer">
                {what}
              </a>{" "}
              by {by}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">Demo listings</h2>
        <p>The demo listings use these photographs from Wikimedia Commons as stand-ins. They show other places, not the listed rooms.</p>
        <ul className="flex flex-col gap-2">
          {credits.map((c) => (
            <li key={c.id}>
              <a href={c.page} className="font-medium text-ink underline underline-offset-2" rel="noopener noreferrer">
                {decodeURIComponent(c.page.split("File:")[1] ?? c.id).replace(/_/g, " ")}
              </a>{" "}
              by {c.by},{" "}
              <a href={c.licenceUrl} className="underline underline-offset-2" rel="noopener noreferrer">
                {c.licence}
              </a>
              . Resized and converted to WebP.
            </li>
          ))}
        </ul>
      </section>
    </ContentPage>
  );
}
