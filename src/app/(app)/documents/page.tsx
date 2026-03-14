import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type DocumentRevision = {
  revision_code: string;
  status: string;
  created_at: string;
};

type DocumentRow = {
  id: string;
  document_number: string;
  title: string;
  document_type: string;
  owner_entity_type: string;
  status: string;
  current_revision: DocumentRevision | DocumentRevision[] | null;
};

const documentPageRoles = ["admin", "engineer", "approver", "supplier"] as const;
const lifecycleFilterOptions = ["all", "draft", "review", "released"] as const;

function normalizeRevision(revision: DocumentRow["current_revision"]) {
  if (Array.isArray(revision)) {
    return revision[0] ?? null;
  }

  return revision;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

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

function getStatusTone(status: string) {
  switch (status.toLowerCase()) {
    case "released":
    case "approved":
      return "success" as const;
    case "review":
    case "in_review":
      return "warning" as const;
    case "draft":
      return "info" as const;
    default:
      return "default" as const;
  }
}

export default async function DocumentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const access = await getAuthenticatedAppContext();

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (access.status === "unauthorized") {
    redirect("/unauthorized");
  }

  if (!hasRoleAccess(access.user.role, documentPageRoles)) {
    redirect("/unauthorized");
  }

  const resolvedSearchParams = await searchParams;
  const queryValueRaw = resolvedSearchParams.q;
  const statusValueRaw = resolvedSearchParams.status;
  const queryValue =
    typeof queryValueRaw === "string" ? queryValueRaw.trim() : "";
  const selectedStatus =
    typeof statusValueRaw === "string" &&
    lifecycleFilterOptions.includes(statusValueRaw as (typeof lifecycleFilterOptions)[number])
      ? statusValueRaw
      : "all";

  const supabase = await createClient();
  let documentQuery = supabase.from("documents").select(
    `
      id,
      document_number,
      title,
      document_type,
      owner_entity_type,
      status,
      current_revision:document_revisions!documents_current_revision_id_fkey (
        revision_code,
        status,
        created_at
      )
    `,
  );

  if (queryValue) {
    const escapedQuery = queryValue.replaceAll(",", "\\,");
    documentQuery = documentQuery.or(
      `title.ilike.%${escapedQuery}%,document_number.ilike.%${escapedQuery}%,document_type.ilike.%${escapedQuery}%,owner_entity_type.ilike.%${escapedQuery}%`,
    );
  }

  if (selectedStatus !== "all") {
    documentQuery = documentQuery.eq("status", selectedStatus);
  }

  const { data, error } = await documentQuery.order("updated_at", { ascending: false });

  const documents = ((data ?? []) as DocumentRow[]).map((document) => ({
    ...document,
    currentRevision: normalizeRevision(document.current_revision),
  }));

  const totalDocuments = documents.length;
  const releasedDocuments = documents.filter(
    (document) => document.status.toLowerCase() === "released",
  ).length;
  const draftingDocuments = documents.filter(
    (document) => document.status.toLowerCase() === "draft",
  ).length;

  return (
    <main className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-900/10 bg-white/85 p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
              Product data
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              Document control
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Review controlled documents by type, lifecycle status, and current
              revision.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f6f1] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Total docs
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(totalDocuments)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-900/10 bg-amber-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                Drafting
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(draftingDocuments)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-900/10 bg-emerald-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Released
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(releasedDocuments)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-900/8 bg-[#f8f6f1] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={error ? "connection issue" : "revision tracking"}
              tone={error ? "warning" : "success"}
            />
            <p className="text-sm text-slate-600">
              {error
                ? "Document records are temporarily unavailable."
                : "Select a document to view its full revision history and upload a new revision."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="border-b border-slate-900/8 pb-5">
          <p className="text-sm font-medium text-slate-500">Document list</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Controlled records
          </h2>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]" method="get">
          <input
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
            defaultValue={queryValue}
            name="q"
            placeholder="Search by title, number, type, or owner"
            type="text"
          />
          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
            defaultValue={selectedStatus}
            name="status"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="released">Released</option>
          </select>
          <button
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            type="submit"
          >
            Apply
          </button>
          <Link
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
            href="/documents"
          >
            Reset
          </Link>
        </form>

        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
          Showing {formatCount(documents.length)} matching documents
        </p>

        <div className="mt-5">
          <DataTable
            columns={[
              {
                key: "title",
                header: "Document",
                render: (row) => (
                  <div>
                    <Link
                      className="font-semibold text-slate-950 transition hover:text-teal-700"
                      href={`/documents/${row.id}`}
                    >
                      {row.title}
                    </Link>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {row.document_number}
                    </p>
                  </div>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (row) => row.document_type,
              },
              {
                key: "owner",
                header: "Owner",
                render: (row) => row.owner_entity_type.replaceAll("_", " "),
              },
              {
                key: "status",
                header: "Lifecycle",
                render: (row) => (
                  <StatusBadge
                    label={row.status.replaceAll("_", " ")}
                    tone={getStatusTone(row.status)}
                  />
                ),
              },
              {
                key: "revision",
                header: "Current revision",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {row.currentRevision?.revision_code ?? "None"}
                    </span>
                    {row.currentRevision ? (
                      <StatusBadge
                        label={row.currentRevision.status.replaceAll("_", " ")}
                        tone={getStatusTone(row.currentRevision.status)}
                      />
                    ) : null}
                  </div>
                ),
              },
              {
                key: "updated",
                header: "Revision date",
                render: (row) => formatDate(row.currentRevision?.created_at ?? null),
              },
            ]}
            emptyState={
              error
                ? "Documents could not be loaded from Supabase."
                : "No controlled documents found for this organization yet."
            }
            rows={documents}
          />
        </div>
      </section>
    </main>
  );
}
