import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen px-5 py-6 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_0.75fr]">
        <section className="fade-up rounded-[1.9rem] border border-line/90 bg-surface p-7 shadow-[0_26px_80px_-62px_rgba(15,23,42,0.52)] sm:p-9">
          <p className="text-xs font-semibold tracking-wide text-amber-700">Access denied</p>
          <h1 className="mt-4 max-w-xl font-[family-name:var(--font-display)] text-4xl tracking-[-0.04em] text-slate-950 sm:text-5xl">
            You are signed in, but this area is restricted.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700 sm:text-base">
            Your account needs one of the supported application roles before you can
            access this section.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
              <p className="text-xs font-medium text-slate-600">Supported roles</p>
              <p className="mt-2 text-base font-semibold text-slate-900">Admin</p>
            </div>
            <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
              <p className="text-xs font-medium text-slate-600">Product access</p>
              <p className="mt-2 text-base font-semibold text-slate-900">Engineer</p>
            </div>
            <div className="rounded-[1rem] border border-line bg-surface-muted p-4">
              <p className="text-xs font-medium text-slate-600">Review flow</p>
              <p className="mt-2 text-base font-semibold text-slate-900">Approver / Supplier</p>
            </div>
          </div>
        </section>

        <section className="fade-up fade-up-delay-1 rounded-[1.9rem] border border-line/90 bg-surface/90 p-7 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.48)] backdrop-blur sm:p-8">
          <p className="text-xs font-semibold tracking-wide text-slate-600">Next step</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[-0.03em] text-slate-950">
            Ask an administrator to update your role.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Once your role is assigned, sign in again and the application shell will
            route you into the permitted modules automatically.
          </p>

          <div className="mt-6 rounded-[1rem] border border-line bg-surface-muted p-4 text-sm leading-7 text-slate-700">
            Contact your workspace administrator to request the required access level.
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
              href="/sign-in"
            >
              Back to sign in
            </Link>
            <Link
              className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-white"
              href="/"
            >
              Go home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
