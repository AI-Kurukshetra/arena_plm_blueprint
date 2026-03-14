export default function DashboardPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-900/10 bg-white/85 p-8 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
          Workspace
        </p>
        <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          Track product data health, open review load, and release activity across your
          organization.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[1.8rem] border border-slate-900/10 bg-white/85 p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Products in review</p>
          <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">
            12 active records
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Products waiting for engineering or approver sign-off before release.
          </p>
        </div>
        <div className="rounded-[1.8rem] border border-slate-900/10 bg-white/85 p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Released this month</p>
          <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">
            24 revisions
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Combined product and part revisions moved to released state this month.
          </p>
        </div>
        <div className="rounded-[1.8rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_28px_70px_-50px_rgba(15,23,42,0.9)]">
          <p className="text-sm font-medium text-slate-300">Supplier readiness</p>
          <p className="mt-3 text-lg font-semibold tracking-[-0.03em]">
            9 pending packages
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Approved files and release packets currently waiting for supplier handoff.
          </p>
        </div>
      </section>
    </main>
  );
}
