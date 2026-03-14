import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type CadRevision = {
  revision_code: string;
  status: string;
  viewer_url: string | null;
  created_at: string;
};

type CadRow = {
  id: string;
  cad_number: string;
  title: string;
  cad_type: string | null;
  owner_entity_type: string;
  status: string;
  current_revision: CadRevision | CadRevision[] | null;
};

const cadPageRoles = ["admin", "engineer", "supplier"] as const;

function normalizeRevision(revision: CadRow["current_revision"]) {
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

export default async function CadFilesPage() {
  const access = await getAuthenticatedAppContext();

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (access.status === "unauthorized") {
    redirect("/unauthorized");
  }

  if (!hasRoleAccess(access.user.role, cadPageRoles)) {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cad_files")
    .select(
      `
        id,
        cad_number,
        title,
        cad_type,
        owner_entity_type,
        status,
        current_revision:cad_file_revisions!cad_files_current_revision_id_fkey (
          revision_code,
          status,
          viewer_url,
          created_at
        )
      `,
    )
    .order("updated_at", { ascending: false });

  const cadFiles = ((data ?? []) as CadRow[]).map((cadFile) => ({
    ...cadFile,
    currentRevision: normalizeRevision(cadFile.current_revision),
  }));

  const totalCadFiles = cadFiles.length;
  const viewerLinked = cadFiles.filter((cadFile) => Boolean(cadFile.currentRevision?.viewer_url))
    .length;
  const releasedCad = cadFiles.filter((cadFile) => cadFile.status.toLowerCase() === "released")
    .length;

  return (
    <main className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-900/10 bg-white/85 p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
              Product data
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              CAD reference hub
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Track CAD assets with revision history, storage metadata, and external
              viewer links for design review.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f6f1] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Total CAD
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(totalCadFiles)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-cyan-900/10 bg-cyan-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Viewer linked
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(viewerLinked)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-900/10 bg-emerald-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Released
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(releasedCad)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-900/8 bg-[#f8f6f1] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={error ? "connection issue" : "reference tracking"}
              tone={error ? "warning" : "success"}
            />
            <p className="text-sm text-slate-600">
              {error
                ? "CAD records are temporarily unavailable."
                : "Select a CAD record to view revision history and upload a new revision."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="border-b border-slate-900/8 pb-5">
          <p className="text-sm font-medium text-slate-500">CAD list</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Controlled CAD files
          </h2>
        </div>

        <div className="mt-5">
          <DataTable
            columns={[
              {
                key: "title",
                header: "CAD file",
                render: (row) => (
                  <div>
                    <Link
                      className="font-semibold text-slate-950 transition hover:text-teal-700"
                      href={`/cad/${row.id}`}
                    >
                      {row.title}
                    </Link>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {row.cad_number}
                    </p>
                  </div>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (row) => row.cad_type || "Unassigned",
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
                ? "CAD files could not be loaded from Supabase."
                : "No CAD files found for this organization yet."
            }
            rows={cadFiles}
          />
        </div>
      </section>
    </main>
  );
}
