import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Log in" };

export default function SignInPage() {
  return (
    <AuthShell title="Log in" intro="Welcome back. Your saved rooms and messages are waiting.">
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
