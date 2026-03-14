import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DocumentRevisionUploadForm } from "@/components/app/document-revision-upload-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type DocumentRecord = {
  id: string;
  document_number: string;
  title: string;
  document_type: string;
  owner_entity_type: string;
  owner_entity_id: string;
  status: string;
  created_at: string;
  current_revision_id: string | null;
};

type DocumentRevisionRecord = {
  id: string;
  revision_code: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: string;
  created_at: string;
};

const documentPageRoles = ["admin", "engineer", "approver", "supplier"] as const;

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

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return "Unknown";
  }

  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${mb.toFixed(2)} MB`;
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

export default async function DocumentDetailPage({
  params,
}: Readonly<{
  params: Promise<{ documentId: string }>;
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

  const { documentId } = await params;
  const supabase = await createClient();

  const [{ data: document, error: documentError }, { data: revisions, error: revisionsError }] =
    await Promise.all([
      supabase
        .from("documents")
        .select(
          `
            id,
            document_number,
            title,
            document_type,
            owner_entity_type,
            owner_entity_id,
            status,
            created_at,
            current_revision_id
          `,
        )
        .eq("id", documentId)
        .maybeSingle<DocumentRecord>(),
      supabase
        .from("document_revisions")
        .select(
          `
            id,
            revision_code,
            file_name,
            storage_bucket,
            storage_path,
            mime_type,
            file_size_bytes,
            status,
            created_at
          `,
        )
        .eq("document_id", documentId)
        .order("created_at", { ascending: false }),
    ]);

  if (documentError) {
    throw new Error(documentError.message);
  }

  if (!document) {
    notFound();
  }

  const documentRevisions = (revisions ?? []) as DocumentRevisionRecord[];
  const currentRevision =
    documentRevisions.find((revision) => revision.id === document.current_revision_id) ?? null;

  return (
    <main className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-900/10 bg-white/85 p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:text-slate-800"
              href="/documents"
            >
              Document control
            </Link>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              {document.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusBadge
                label={document.status.replaceAll("_", " ")}
                tone={getStatusTone(document.status)}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {document.document_number}
              </span>
              <span className="rounded-full border border-slate-900/8 bg-[#f8f6f1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {document.document_type}
              </span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Owner: {document.owner_entity_type.replaceAll("_", " ")} /{" "}
              {document.owner_entity_id}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f6f1] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Current rev
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {currentRevision?.revision_code ?? "None"}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f6f1] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Revision count
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {documentRevisions.length}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-900/10 bg-emerald-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Created
              </p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                {formatDate(document.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-900/8 bg-[#f8f6f1] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={revisionsError ? "history unavailable" : "revision history"}
              tone={revisionsError ? "warning" : "info"}
            />
            <p className="text-sm text-slate-600">
              {revisionsError
                ? "Revision records are temporarily unavailable."
                : "Upload a new revision file to add a controlled update to this document."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="border-b border-slate-900/8 pb-5">
            <p className="text-sm font-medium text-slate-500">Revision timeline</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Controlled revision history
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {documentRevisions.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-900/12 bg-[#f8f6f1] p-6 text-sm text-slate-500">
                No revisions recorded for this document yet.
              </div>
            ) : (
              documentRevisions.map((revision) => {
                const isCurrent = revision.id === document.current_revision_id;

                return (
                  <article
                    key={revision.id}
                    className={`rounded-[1.5rem] border p-5 ${
                      isCurrent
                        ? "border-teal-900/20 bg-teal-50/60"
                        : "border-slate-900/8 bg-[#f8f6f1]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                            Revision {revision.revision_code}
                          </p>
                          <StatusBadge
                            label={revision.status.replaceAll("_", " ")}
                            tone={getStatusTone(revision.status)}
                          />
                          {isCurrent ? <StatusBadge label="current" tone="info" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{revision.file_name}</p>
                      </div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        {formatDate(revision.created_at)}
                      </p>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          File size
                        </dt>
                        <dd className="mt-1">{formatBytes(revision.file_size_bytes)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          MIME type
                        </dt>
                        <dd className="mt-1">{revision.mime_type || "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Storage path
                        </dt>
                        <dd className="mt-1 break-all">{revision.storage_path}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <aside className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Upload screen</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Add revision file
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Uploading a file creates a new draft revision and marks it as the current
            revision pointer for this document.
          </p>

          <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <DocumentRevisionUploadForm documentId={document.id} />
          </div>
        </aside>
      </section>
    </main>
  );
}
