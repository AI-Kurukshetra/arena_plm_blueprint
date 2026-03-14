import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type ProductRevision = {
  id: string;
  revision_code: string;
  status: string;
  summary: string | null;
  released_at: string | null;
  created_at: string;
};

type ProductRecord = {
  id: string;
  product_code: string;
  name: string;
  description: string | null;
  category: string | null;
  lifecycle_status: string;
  created_at: string;
  current_revision_id: string | null;
};

const productPageRoles = ["admin", "engineer", "approver"] as const;

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

function formatDateTime(value: string) {
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

export default async function ProductDetailPage({
  params,
}: Readonly<{
  params: Promise<{ productId: string }>;
}>) {
  const access = await getAuthenticatedAppContext();

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (access.status === "unauthorized") {
    redirect("/unauthorized");
  }

  if (!hasRoleAccess(access.user.role, productPageRoles)) {
    redirect("/unauthorized");
  }

  const { productId } = await params;
  const supabase = await createClient();

  const [{ data: product, error: productError }, { data: revisions, error: revisionsError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          `
            id,
            product_code,
            name,
            description,
            category,
            lifecycle_status,
            created_at,
            current_revision_id
          `,
        )
        .eq("id", productId)
        .maybeSingle<ProductRecord>(),
      supabase
        .from("product_revisions")
        .select(
          `
            id,
            revision_code,
            status,
            summary,
            released_at,
            created_at
          `,
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: false }),
    ]);

  if (productError) {
    throw new Error(productError.message);
  }

  if (!product) {
    notFound();
  }

  const productRevisions = (revisions ?? []) as ProductRevision[];
  const releasedRevisionCount = productRevisions.filter(
    (revision) => revision.status.toLowerCase() === "released",
  ).length;
  const currentRevision =
    productRevisions.find((revision) => revision.id === product.current_revision_id) ?? null;

  return (
    <main className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-900/10 bg-white/85 p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:text-slate-800"
              href="/products"
            >
              Product catalog
            </Link>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              {product.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusBadge
                label={product.lifecycle_status.replaceAll("_", " ")}
                tone={getStatusTone(product.lifecycle_status)}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {product.product_code}
              </span>
              {product.category ? (
                <span className="rounded-full border border-slate-900/8 bg-[#f8f6f1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {product.category}
                </span>
              ) : null}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              {product.description || "No product summary has been added yet."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f6f1] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Current revision
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
                {productRevisions.length}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-900/10 bg-emerald-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Released revisions
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {releasedRevisionCount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[1.5rem] border border-slate-900/8 bg-[#f8f6f1] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label={revisionsError ? "history unavailable" : "revision history"}
                tone={revisionsError ? "warning" : "info"}
              />
              <p className="text-sm text-slate-600">
                {revisionsError
                  ? "Revision records are temporarily unavailable for this product."
                  : "Revision history is available for this product."}
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-900/8 bg-slate-950 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200">
              First recorded
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              {formatDateTime(product.created_at)}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Initial controlled record creation date for this product item.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="border-b border-slate-900/8 pb-5">
            <p className="text-sm font-medium text-slate-500">Revision history</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Timeline of controlled changes
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {productRevisions.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-900/12 bg-[#f8f6f1] p-6 text-sm text-slate-500">
                No revisions recorded for this product yet.
              </div>
            ) : (
              productRevisions.map((revision) => {
                const isCurrent = revision.id === product.current_revision_id;

                return (
                  <article
                    key={revision.id}
                    className={`rounded-[1.5rem] border p-5 transition ${
                      isCurrent
                        ? "border-teal-900/20 bg-teal-50/60"
                        : "border-slate-900/8 bg-[#f8f6f1]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                            Revision {revision.revision_code}
                          </p>
                          <StatusBadge
                            label={revision.status.replaceAll("_", " ")}
                            tone={getStatusTone(revision.status)}
                          />
                          {isCurrent ? <StatusBadge label="current" tone="success" /> : null}
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                          {revision.summary || "No revision summary provided."}
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] border border-slate-900/8 bg-white/80 px-4 py-3 text-sm text-slate-600">
                        <p>Created {formatDateTime(revision.created_at)}</p>
                        <p className="mt-1">
                          Released {formatDate(revision.released_at)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Record summary</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.25rem] border border-slate-900/8 bg-[#f8f6f1] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Current release
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                  {currentRevision
                    ? `Revision ${currentRevision.revision_code}`
                    : "No active revision"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-900/8 bg-[#f8f6f1] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Release timing
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                  {formatDate(currentRevision?.released_at ?? null)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-slate-900/10 bg-[#f8f6f1] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.25)]">
            <p className="text-sm font-medium text-slate-500">Record scope</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This record includes lifecycle status, revision timeline, and current
              release details.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
