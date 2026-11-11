import { ContentPage } from "@/components/content-page";
import { SavedList } from "./saved-list";

export const metadata = { title: "Saved listings" };

export default function Saved() {
  return (
    <ContentPage title="Saved listings" intro="Saved on this device. Sign-in will keep them across devices once accounts open.">
      <SavedList />
    </ContentPage>
  );
}
