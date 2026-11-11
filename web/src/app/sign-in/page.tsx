import Link from "next/link";
import { ContentPage } from "@/components/content-page";

export const metadata = { title: "Log in or sign up" };

export default function SignIn() {
  return (
    <ContentPage
      title="Log in or sign up"
      intro="Accounts are not switched on yet. They arrive with the database milestone, using Neon Auth."
    >
      <p>
        Until then you can search and save listings on this device without an account.{" "}
        <Link href="/" className="font-medium text-ink underline underline-offset-2">
          Back to the search
        </Link>
      </p>
    </ContentPage>
  );
}
