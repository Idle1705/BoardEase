"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { createProfile } from "@/server/profiles";

/** `field` names the input an error belongs to, so it can be shown next to that input. */
export type AuthFormState = { error?: string; field?: string; fields?: Record<string, string> };

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
const password = z.string().min(8, "Use at least 8 characters for your password.").max(128);

/** Only same-site paths, so a crafted link can't send people elsewhere after signing in. */
function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/account";
}

const friendly = (message?: string) => {
  const m = (message ?? "").toLowerCase();
  if (m.includes("already") || m.includes("exists")) return "An account with this email already exists. Log in instead.";
  if (m.includes("invalid") && (m.includes("password") || m.includes("email") || m.includes("credential")))
    return "That email and password don't match. Check them and try again.";
  if (m.includes("too many") || m.includes("rate")) return "Too many attempts. Wait a minute, then try again.";
  return "Sign-in isn't responding right now. Try again in a moment.";
};

export async function signInAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  const fields = { email: String(form.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0] ?? ""), fields };

  const { error } = await auth.signIn.email(parsed.data);
  if (error) return { error: friendly(error.message), fields };
  redirect(safeNext(form.get("next")));
}

export async function signUpAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter your name.").max(80),
      email,
      password,
      role: z.enum(["renter", "owner"], { message: "Choose how you'll use BoardEase." }),
    })
    .safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") });
  const fields = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), role: String(form.get("role") ?? "renter") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0] ?? ""), fields };

  const { name, role } = parsed.data;
  const { data, error } = await auth.signUp.email({ name, email: parsed.data.email, password: parsed.data.password });
  if (error || !data?.user) return { error: friendly(error?.message), fields };
  await createProfile(data.user.id, name, role);
  redirect("/account");
}

