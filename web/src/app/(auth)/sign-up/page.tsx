import { AuthShell } from "../auth-shell";
import { SignUpForm } from "../auth-forms";

export const metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your account" intro="Free for renters and owners in Davao City.">
      <SignUpForm />
    </AuthShell>
  );
}
