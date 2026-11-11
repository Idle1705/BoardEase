import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "../auth-forms";

export const metadata = { title: "Create an account" };

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <AuthShell title="Create your account" intro="Free for renters and owners in Davao City.">
      <Suspense fallback={<SignUpForm />}>
        <RoleAwareForm searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

// "List Your Property" links here with ?role=owner, so the owner option starts selected
async function RoleAwareForm({ searchParams }: { searchParams: PageProps<"/sign-up">["searchParams"] }) {
  const { role } = await searchParams;
  return <SignUpForm initialRole={role === "owner" ? "owner" : "renter"} />;
}
