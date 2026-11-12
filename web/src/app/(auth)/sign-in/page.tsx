import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Log in" };

export default function SignInPage() {
  return (
    <AuthShell title="Log in" intro="Log in to your BoardEase account. Owners manage their properties and rooms from here.">
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
