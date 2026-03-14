import Link from "next/link";

import { SignOutForm } from "@/components/auth/sign-out-form";

const features = [
  {
    title: "Single source of truth",
    description: "Products, parts, and BOM revisions live in one reliable place.",
  },
  {
    title: "Clear release decisions",
    description: "Approvals and change records stay readable from draft to release.",
  },
  {
    title: "Controlled collaboration",
    description: "Share approved files with suppliers without losing governance.",
  },
];

export function LandingExperience({
  isAuthenticated,
}: Readonly<{
  isAuthenticated: boolean;
}>) {
  return (
    <main className="min-h-screen text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-line/90 bg-surface/85 px-5 py-4 shadow-[0_24px_60px_-52px_rgba(15,23,42,0.65)] backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-accent" />
            <p className="text-sm font-semibold tracking-wide text-slate-800">NextGen PLM</p>
          </div>
          {isAuthenticated ? (
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <SignOutForm className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                href="/sign-in"
              >
                Sign in
              </a>
              <a
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
                href="/sign-up"
              >
                Sign up
              </a>
            </div>
          )}
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:py-12">
          <section className="fade-up rounded-[2rem] border border-line/90 bg-surface p-7 shadow-[0_28px_85px_-62px_rgba(15,23,42,0.5)] sm:p-10">
            <p className="inline-flex rounded-full border border-line bg-surface-muted px-3 py-1.5 text-xs font-medium tracking-wide text-slate-700">
              Built for engineering and operations
            </p>
            <h1 className="mt-6 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[0.94] tracking-[-0.04em] text-slate-950 sm:text-6xl">
              Product change, kept simple.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              NextGen PLM helps teams manage products, BOMs, documents, CAD
              references, and change workflows in one connected system designed for
              focused decision-making.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <a
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
                href="/sign-up"
              >
                Get started
              </a>
              <a
                className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-white"
                href="/sign-in"
              >
                Sign in
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-line bg-surface-muted p-4">
                <p className="text-xs font-medium text-slate-600">Controlled records</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Products and BOMs</p>
              </div>
              <div className="rounded-[1.2rem] border border-line bg-surface-muted p-4">
                <p className="text-xs font-medium text-slate-600">Traceable flow</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Revisions and approvals</p>
              </div>
              <div className="rounded-[1.2rem] border border-line bg-surface-muted p-4">
                <p className="text-xs font-medium text-slate-600">Supplier ready</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Documents and CAD</p>
              </div>
            </div>
          </section>

          <section className="fade-up fade-up-delay-1 rounded-[2rem] border border-line/90 bg-surface/90 p-6 shadow-[0_22px_70px_-52px_rgba(15,23,42,0.5)] sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-600">Platform overview</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.03em] text-slate-900">
                  One calm release room
                </h2>
              </div>
              <div className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
                Product
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[1.1rem] border border-line bg-surface p-4"
                >
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-[1.1rem] border border-line bg-surface-muted p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-600">
                Lifecycle clarity
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Teams can align faster when records, approvals, and supplier files stay
                connected in a single workflow.
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
