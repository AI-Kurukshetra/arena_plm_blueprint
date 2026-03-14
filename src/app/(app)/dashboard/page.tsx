import Link from "next/link";
import { redirect } from "next/navigation";

import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type ProductRow = {
  id: string;
  name: string;
  product_code: string;
  lifecycle_status: string;
};

type PartRow = {
  id: string;
  name: string;
  part_number: string;
  lifecycle_status: string;
};

type ChangeRow = {
  id: string;
  change_number: string;
  title: string;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  released_at: string | null;
  created_at: string;
};

type ApprovalRow = {
  id: string;
  change_request_id: string;
  status: string;
};

type DocumentRow = {
  id: string;
  title: string;
  document_number: string;
  status: string;
};

type CadRow = {
  id: string;
  title: string;
  cad_number: string;
  status: string;
};

const changeAccessRoles = ["admin", "engineer", "approver"] as const;
const approvalAccessRoles = ["admin", "approver"] as const;
const cadAccessRoles = ["admin", "engineer", "supplier"] as const;
const productAccessRoles = ["admin", "engineer", "approver"] as const;
const documentAccessRoles = ["admin", "engineer", "approver", "supplier"] as const;

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function getStatusTone(status: string) {
  switch (status.toLowerCase()) {
    case "released":
    case "approved":
      return "success" as const;
    case "review":
    case "in_review":
    case "pending":
      return "warning" as const;
    case "draft":
      return "info" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

function getDeltaLabel(released: number, total: number) {
  if (total === 0) {
    return "No tracked records yet";
  }

  return `${Math.round((released / total) * 100)}% released`;
}

export default async function DashboardPage() {
  const access = await getAuthenticatedAppContext();

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (access.status === "unauthorized") {
    redirect("/unauthorized");
  }

  const canSeeChanges = hasRoleAccess(access.user.role, changeAccessRoles);
  const canSeeApprovals = hasRoleAccess(access.user.role, approvalAccessRoles);
  const canSeeProducts = hasRoleAccess(access.user.role, productAccessRoles);
  const canSeeDocuments = hasRoleAccess(access.user.role, documentAccessRoles);
  const canSeeCad = hasRoleAccess(access.user.role, cadAccessRoles);

  const supabase = await createClient();

  const [
    { data: productsData, error: productsError },
    { data: partsData, error: partsError },
    { data: changesData, error: changesError },
    { data: approvalsData, error: approvalsError },
    { data: documentsData, error: documentsError },
    { data: cadData, error: cadError },
  ] = await Promise.all([
    canSeeProducts
      ? supabase
          .from("products")
          .select("id,name,product_code,lifecycle_status")
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canSeeProducts
      ? supabase
          .from("parts")
          .select("id,name,part_number,lifecycle_status")
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canSeeChanges
      ? supabase
          .from("change_requests")
          .select(
            "id,change_number,title,status,submitted_at,approved_at,released_at,created_at",
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canSeeApprovals
      ? supabase
          .from("approvals")
          .select("id,change_request_id,status")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canSeeDocuments
      ? supabase
          .from("documents")
          .select("id,title,document_number,status")
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canSeeCad
      ? supabase
          .from("cad_files")
          .select("id,title,cad_number,status")
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const products = (productsData ?? []) as ProductRow[];
  const parts = (partsData ?? []) as PartRow[];
  const changes = (changesData ?? []) as ChangeRow[];
  const approvals = (approvalsData ?? []) as ApprovalRow[];
  const documents = (documentsData ?? []) as DocumentRow[];
  const cadFiles = (cadData ?? []) as CadRow[];

  const releasedProducts = products.filter(
    (item) => item.lifecycle_status.toLowerCase() === "released",
  ).length;
  const releasedParts = parts.filter(
    (item) => item.lifecycle_status.toLowerCase() === "released",
  ).length;
  const openChanges = changes.filter((item) => {
    const status = item.status.toLowerCase();
    return status === "draft" || status === "review" || status === "approved";
  }).length;
  const pendingApprovals = approvals.filter(
    (item) => item.status.toLowerCase() === "pending",
  ).length;
  const releasedDocuments = documents.filter(
    (item) => item.status.toLowerCase() === "released",
  ).length;
  const releasedCadFiles = cadFiles.filter(
    (item) => item.status.toLowerCase() === "released",
  ).length;

  const recentChanges = changes.slice(0, 5);
  const recentDocuments = documents.slice(0, 4);
  const recentCadFiles = cadFiles.slice(0, 4);

  const moduleCards = [
    {
      label: "Products",
      href: "/products",
      enabled: canSeeProducts,
      total: products.length,
      emphasis: formatCount(releasedProducts),
      note: getDeltaLabel(releasedProducts, products.length),
      tone: "bg-[#fbf8f1] border-slate-900/10",
    },
    {
      label: "Parts",
      href: "/parts",
      enabled: canSeeProducts,
      total: parts.length,
      emphasis: formatCount(releasedParts),
      note: getDeltaLabel(releasedParts, parts.length),
      tone: "bg-white border-slate-900/10",
    },
    {
      label: "Changes",
      href: "/changes",
      enabled: canSeeChanges,
      total: changes.length,
      emphasis: formatCount(openChanges),
      note: `${formatCount(pendingApprovals)} approvals still pending`,
      tone: "bg-amber-50/80 border-amber-900/10",
    },
    {
      label: "Documents",
      href: "/documents",
      enabled: canSeeDocuments,
      total: documents.length,
      emphasis: formatCount(releasedDocuments),
      note: getDeltaLabel(releasedDocuments, documents.length),
      tone: "bg-emerald-50/80 border-emerald-900/10",
    },
    {
      label: "CAD files",
      href: "/cad",
      enabled: canSeeCad,
      total: cadFiles.length,
      emphasis: formatCount(releasedCadFiles),
      note: getDeltaLabel(releasedCadFiles, cadFiles.length),
      tone: "bg-cyan-50/80 border-cyan-900/10",
    },
  ].filter((card) => card.enabled);

  const dataIssues = [
    productsError,
    partsError,
    changesError,
    approvalsError,
    documentsError,
    cadError,
  ].filter(Boolean).length;

  return (
    <main className="space-y-7">
      <section className="overflow-hidden rounded-[2.2rem] border border-slate-900/10 bg-[linear-gradient(135deg,#f5f1e8_0%,#ffffff_42%,#eef7f4_100%)] px-6 py-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:px-8 sm:py-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
              Workspace
            </p>
            <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.6rem]">
              Operational dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
              Live coverage of the modules already running in this workspace: product
              records, change control, controlled documents, and CAD references.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[34rem] xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/90 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Products
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                {formatCount(products.length)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/90 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Parts
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                {formatCount(parts.length)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-900/10 bg-amber-50/85 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Open changes
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                {formatCount(openChanges)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-sky-900/10 bg-sky-50/85 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Pending approvals
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                {formatCount(pendingApprovals)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StatusBadge
            label={dataIssues > 0 ? "partial data" : "live workspace"}
            tone={dataIssues > 0 ? "warning" : "success"}
          />
          <p className="text-sm text-slate-600">
            {dataIssues > 0
              ? "Some dashboard modules could not be loaded from Supabase."
              : "Dashboard metrics are generated from the current organization data."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        {moduleCards.map((card) => (
          <Link
            key={card.label}
            className={`flex min-h-[184px] flex-col rounded-[1.7rem] border p-5 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 ${card.tone}`}
            href={card.href}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {card.label}
            </p>
            <div className="mt-5 flex flex-1 flex-col justify-between gap-5">
              <div>
                <p className="text-[2.4rem] font-semibold tracking-[-0.07em] text-slate-950">
                  {formatCount(card.total)}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">total tracked</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Current signal
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  {card.emphasis}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{card.note}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex items-end justify-between gap-4 border-b border-slate-900/8 pb-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Change control</p>
              <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-950">
                Recent lifecycle activity
              </h2>
            </div>
            {canSeeChanges ? (
              <Link
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
                href="/changes"
              >
                Open queue
              </Link>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {!canSeeChanges ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Your role does not include the change workspace.
              </p>
            ) : recentChanges.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No change requests are recorded yet.
              </p>
            ) : (
              recentChanges.map((change) => (
                <Link
                  key={change.id}
                  className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 transition hover:bg-white"
                  href={`/changes/${change.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{change.change_number}</p>
                      <p className="mt-1 text-[15px] leading-6 text-slate-600">{change.title}</p>
                    </div>
                    <StatusBadge
                      label={change.status.replaceAll("_", " ")}
                      tone={getStatusTone(change.status)}
                    />
                  </div>
                  <div className="mt-4 grid gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-3">
                    <span>Submitted {formatDate(change.submitted_at)}</span>
                    <span>Approved {formatDate(change.approved_at)}</span>
                    <span>Released {formatDate(change.released_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[1.9rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_28px_70px_-50px_rgba(15,23,42,0.9)]">
            <p className="text-sm font-medium text-slate-300">Release readiness</p>
            <p className="mt-3 text-[2.4rem] font-semibold tracking-[-0.06em]">
              {formatCount(releasedDocuments + releasedCadFiles)}
            </p>
            <p className="mt-2 text-[15px] leading-7 text-slate-300">
              Controlled files currently in released state across document control and CAD.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Documents released
                </p>
                <p className="mt-2 text-xl font-semibold">{formatCount(releasedDocuments)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  CAD released
                </p>
                <p className="mt-2 text-xl font-semibold">{formatCount(releasedCadFiles)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="border-b border-slate-900/8 pb-4">
              <p className="text-sm font-medium text-slate-500">Controlled files</p>
              <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-950">
                Latest records
              </h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Documents
                  </p>
                  {canSeeDocuments ? (
                    <Link className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700" href="/documents">
                      Open
                    </Link>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  {!canSeeDocuments ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      Document control is hidden for your role.
                    </p>
                  ) : recentDocuments.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      No documents available yet.
                    </p>
                  ) : (
                    recentDocuments.map((document) => (
                      <Link
                        key={document.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white"
                        href={`/documents/${document.id}`}
                      >
                        <div>
                          <p className="text-[15px] font-semibold text-slate-900">{document.document_number}</p>
                          <p className="text-sm leading-6 text-slate-600">{document.title}</p>
                        </div>
                        <StatusBadge label={document.status} tone={getStatusTone(document.status)} />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    CAD files
                  </p>
                  {canSeeCad ? (
                    <Link className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700" href="/cad">
                      Open
                    </Link>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  {!canSeeCad ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      CAD references are hidden for your role.
                    </p>
                  ) : recentCadFiles.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      No CAD files available yet.
                    </p>
                  ) : (
                    recentCadFiles.map((cadFile) => (
                      <Link
                        key={cadFile.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white"
                        href={`/cad/${cadFile.id}`}
                      >
                        <div>
                          <p className="text-[15px] font-semibold text-slate-900">{cadFile.cad_number}</p>
                          <p className="text-sm leading-6 text-slate-600">{cadFile.title}</p>
                        </div>
                        <StatusBadge label={cadFile.status} tone={getStatusTone(cadFile.status)} />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
