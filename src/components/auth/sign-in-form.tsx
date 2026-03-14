"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const nextPath = searchParams.get("next") || "/dashboard";
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_0.8fr]">
      <section className="fade-up rounded-[1.9rem] border border-line/90 bg-surface p-7 shadow-[0_26px_80px_-62px_rgba(15,23,42,0.52)] sm:p-9">
        <p className="text-sm font-semibold tracking-wide text-slate-700">NextGen PLM</p>
        <h1 className="mt-4 max-w-lg font-[family-name:var(--font-display)] text-4xl tracking-[-0.04em] text-slate-950 sm:text-5xl">
          Sign in to your release workspace.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700 sm:text-base">
          Continue into your organization workspace to manage product records, revisions,
          and approvals.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
            <p className="text-xs font-medium text-slate-600">Records</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Products and parts</p>
          </div>
          <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
            <p className="text-xs font-medium text-slate-600">Control</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Revision history</p>
          </div>
          <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
            <p className="text-xs font-medium text-slate-600">Flow</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Approvals</p>
          </div>
        </div>
      </section>

      <section className="fade-up fade-up-delay-1 rounded-[1.9rem] border border-line/90 bg-surface/90 p-7 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.48)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold tracking-wide text-slate-600">Account access</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[-0.03em] text-slate-950">
          Sign in
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Use your workspace email to continue into the authenticated PLM app.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent/55 focus:ring-4 focus:ring-accent/12"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent/55 focus:ring-4 focus:ring-accent/12"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <button
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-700">
          Need an account?{" "}
          <Link className="font-semibold text-slate-900 underline-offset-4 hover:underline" href="/sign-up">
            Sign up
          </Link>
        </p>
      </section>
    </div>
  );
}
