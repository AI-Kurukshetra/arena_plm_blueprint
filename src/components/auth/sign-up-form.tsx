"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type SignUpStatus =
  | { kind: "idle" }
  | { kind: "success"; message: string };

export function SignUpForm() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState<SignUpStatus>({ kind: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatus({ kind: "idle" });
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization_name: organizationName,
          job_title: jobTitle || null,
          role: "admin",
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setStatus({
      kind: "success",
      message:
        "Account created. Check your email to confirm the signup, then sign in to enter the workspace.",
    });
    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_0.85fr]">
      <section className="fade-up rounded-[1.9rem] border border-line/90 bg-surface p-7 shadow-[0_26px_80px_-62px_rgba(15,23,42,0.52)] sm:p-9">
        <p className="text-sm font-semibold tracking-wide text-slate-700">NextGen PLM</p>
        <h1 className="mt-4 max-w-lg font-[family-name:var(--font-display)] text-4xl tracking-[-0.04em] text-slate-950 sm:text-5xl">
          Create your workspace in minutes.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700 sm:text-base">
          Start with an administrator account, then invite the team and assign roles.
        </p>

        <div className="mt-8 space-y-3">
          <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
            <p className="text-xs font-medium text-slate-600">Setup</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Organization profile</p>
          </div>
          <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
            <p className="text-xs font-medium text-slate-600">Access</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Initial admin account</p>
          </div>
          <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
            <p className="text-xs font-medium text-slate-600">Next</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Invite collaborators</p>
          </div>
        </div>
      </section>

      <section className="fade-up fade-up-delay-1 rounded-[1.9rem] border border-line/90 bg-surface/90 p-7 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.48)] backdrop-blur sm:p-8">
        <p className="text-xs font-semibold tracking-wide text-slate-600">Workspace setup</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[-0.03em] text-slate-950">
          Create account
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          This will create your organization workspace and the matching profile used by
          the authenticated app.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input
              autoComplete="name"
              className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent/55 focus:ring-4 focus:ring-accent/12"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Jordan Lee"
              required
              type="text"
              value={fullName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Organization</span>
            <input
              autoComplete="organization"
              className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent/55 focus:ring-4 focus:ring-accent/12"
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Acme Medical Devices"
              required
              type="text"
              value={organizationName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Job title</span>
            <input
              autoComplete="organization-title"
              className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent/55 focus:ring-4 focus:ring-accent/12"
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Product Engineer"
              type="text"
              value={jobTitle}
            />
          </label>

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
              autoComplete="new-password"
              className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent/55 focus:ring-4 focus:ring-accent/12"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Use at least 8 characters"
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

          {status.kind === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {status.message}
            </div>
          ) : null}

          <button
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-700">
          Already have access?{" "}
          <Link className="font-semibold text-slate-900 underline-offset-4 hover:underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
