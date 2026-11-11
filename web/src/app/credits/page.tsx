import { ContentPage } from "@/components/content-page";
import credits from "@/data/photo-credits.json";

export const metadata = { title: "Photo credits" };

export default function Credits() {
  return (
    <ContentPage
      title="Photo credits"
      intro="The demo listings use these photographs from Wikimedia Commons as stand-ins. They show other places, not the listed rooms."
    >
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
    </ContentPage>
  );
}
