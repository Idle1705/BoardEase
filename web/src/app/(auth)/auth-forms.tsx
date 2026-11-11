"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInAction, signUpAction, type AuthFormState } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signInAction, {});
  const next = useSearchParams().get("next") ?? "";
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} error={errorFor(state, "email")} />
      <PasswordField autoComplete="current-password" error={errorFor(state, "password")} />
      <FormError message={state.field ? undefined : state.error} />
      <Submit pending={pending}>Log in</Submit>
      <p className="text-center text-footnote text-subtle">
        New to BoardEase?{" "}
        <Link href="/sign-up" className="font-medium text-clay underline underline-offset-2 hover:text-clay-hover">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ initialRole = "renter" }: { initialRole?: "renter" | "owner" }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUpAction, {});
  const [role, setRole] = useState(state.fields?.role ? (state.fields.role === "owner" ? "owner" : "renter") : initialRole);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-footnote font-medium text-ink">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["renter", "Find a room", "Search, save and contact owners"],
              ["owner", "Rent out rooms", "List rooms and manage billing"],
            ] as const
          ).map(([value, title, hint]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-lg p-3 ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
                role === value ? "bg-clay-soft ring-2 ring-clay/60" : "ring-ink/15 bg-white hover:bg-surface",
              )}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              <span className="text-body font-medium text-ink">{title}</span>
              <span className="text-footnote text-subtle">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Full name" name="name" autoComplete="name" defaultValue={state.fields?.name} error={errorFor(state, "name")} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} error={errorFor(state, "email")} />
      <PasswordField autoComplete="new-password" hint="At least 8 characters." error={errorFor(state, "password")} />
      <FormError message={state.field ? undefined : state.error} />
      <Submit pending={pending}>Create account</Submit>
      <p className="text-center text-footnote text-subtle">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-clay underline underline-offset-2 hover:text-clay-hover">
          Log in
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-footnote font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoFocus={!!error}
        className={cn(INPUT, error && "ring-2 ring-destructive/70")}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function PasswordField({ autoComplete, hint, error }: { autoComplete: string; hint?: string; error?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-footnote font-medium text-ink">
        Password
      </label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
          autoFocus={!!error}
          className={cn(INPUT, "w-full pr-12", error && "ring-2 ring-destructive/70")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-md text-subtle hover:bg-surface hover:text-ink"
        >
          <span key={String(show)} className="be-icon-in grid place-items-center">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </span>
        </button>
      </div>
      <FieldError id={`${id}-error`} message={error} />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-footnote text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

const INPUT =
  "h-12 rounded-md bg-white px-3.5 text-body text-ink ring-1 ring-ink/15 outline-none transition-shadow placeholder:text-subtle hover:ring-ink/25 focus-visible:ring-2 focus-visible:ring-clay";

const errorFor = (s: AuthFormState, name: string) => (s.field === name ? s.error : undefined);

/** Shown right under its input and announced with it (aria-describedby). */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-footnote font-medium text-destructive">
      {message}
    </p>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-[#fbeceb] px-3 py-2.5 text-footnote text-destructive ring-1 ring-destructive/15">
      {message}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-clay text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97] disabled:opacity-70"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
