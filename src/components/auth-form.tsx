"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, TextField } from "./ui/primitives";
import {
  requestPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  updatePassword,
  type AuthState,
} from "@/app/(auth)/actions";

type Mode = "login" | "signup" | "forgot" | "update";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const ACTIONS: Record<Mode, (s: AuthState, f: FormData) => Promise<AuthState>> = {
  login: signIn,
  signup: signUp,
  forgot: requestPasswordReset,
  update: updatePassword,
};

const COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  login: { title: "Welcome back", subtitle: "Log in to continue your training.", submit: "Log in" },
  signup: { title: "Create your account", subtitle: "Your workouts, saved to your account and private to you.", submit: "Create account" },
  forgot: { title: "Reset your password", subtitle: "We'll email you a link to choose a new password.", submit: "Send reset link" },
  update: { title: "Choose a new password", subtitle: "Use at least 8 characters.", submit: "Save password" },
};

function SubmitButton({ children, variant = "filled" }: { children: React.ReactNode; variant?: "filled" | "gray" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="large" variant={variant} disabled={pending} aria-busy={pending} className={variant === "gray" ? "w-full !bg-surface" : "mt-1 w-full"}>
      {pending ? "Please wait…" : children}
    </Button>
  );
}

/** Reads ?next= and ?error= (URL data, so it streams in behind Suspense). */
function NextField() {
  const next = useSearchParams().get("next");
  return next ? <input type="hidden" name="next" value={next} /> : null;
}
function UrlError() {
  const error = useSearchParams().get("error");
  return error ? <Alert kind="error">{error}</Alert> : null;
}

function Alert({ kind, children }: { kind: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={kind === "error" ? "rounded-xl bg-red/15 px-4 py-3 text-subhead text-red-text" : "rounded-[var(--radius-cell)] bg-surface p-4 text-center text-body"}
    >
      {children}
    </p>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const [state, action] = useActionState(ACTIONS[mode], {});
  const copy = COPY[mode];

  return (
    <div>
      <h1 className="text-center text-title1 font-bold">{copy.title}</h1>
      <p className="mt-1 mb-6 text-center text-subhead text-label-2">{copy.subtitle}</p>

      <Suspense fallback={null}>
        <div className="mb-4 empty:hidden">
          <UrlError />
        </div>
      </Suspense>

      {(mode === "login" || mode === "signup") && (
        <>
          <form action={signInWithGoogle}>
            <Suspense fallback={null}>
              <NextField />
            </Suspense>
            <SubmitButton variant="gray">
              <GoogleLogo /> Continue with Google
            </SubmitButton>
          </form>
          <div className="my-5 flex items-center gap-3 text-footnote text-label-2">
            <span className="h-px flex-1 bg-separator" /> or <span className="h-px flex-1 bg-separator" />
          </div>
        </>
      )}

      {state.message ? (
        <Alert kind="info">{state.message}</Alert>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate={false}>
          <Suspense fallback={null}>
            <NextField />
          </Suspense>
          {state.error && <Alert kind="error">{state.error}</Alert>}
          {mode === "signup" && <TextField label="Name" name="name" autoComplete="name" defaultValue={state.values?.name} maxLength={60} required />}
          {mode !== "update" && (
            <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required />
          )}
          {mode !== "forgot" && (
            <TextField
              label={mode === "update" ? "New password" : "Password"}
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "login" ? undefined : 8}
              required
            />
          )}
          {mode === "update" && <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />}
          {mode === "login" && (
            <Link href="/forgot-password" className="-mt-2 inline-flex min-h-11 items-center self-end text-subhead text-accent">
              Forgot password?
            </Link>
          )}
          <SubmitButton>{copy.submit}</SubmitButton>
        </form>
      )}

      {mode !== "update" && (
        <p className="mt-6 text-center text-subhead text-label-2">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-accent">
                Create an account
              </Link>
            </>
          ) : mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent">
                Log in
              </Link>
            </>
          ) : (
            <Link href="/login" className="font-semibold text-accent">
              Back to log in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
