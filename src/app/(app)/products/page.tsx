import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type ProductRevision = {
  revision_code: string;
  status: string;
  released_at: string | null;
};

type ProductRow = {
  id: string;
  product_code: string;
  name: string;
  description: string | null;
  category: string | null;
  lifecycle_status: string;
  created_at: string;
  current_revision: ProductRevision | ProductRevision[] | null;
};

const productPageRoles = ["admin", "engineer", "approver"] as const;
const lifecycleFilterOptions = ["all", "draft", "review", "released"] as const;

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

function normalizeRevision(revision: ProductRow["current_revision"]) {
  if (Array.isArray(revision)) {
    return revision[0] ?? null;
  }

  return revision;
}

function getLifecycleTone(status: string) {
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

function getRevisionTone(status: string | null | undefined) {
  if (!status) {
    return "default" as const;
  }

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

export default async function ProductsPage({
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

  if (!hasRoleAccess(access.user.role, productPageRoles)) {
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
  let productQuery = supabase.from("products").select(
    `
      id,
      product_code,
      name,
      description,
      category,
      lifecycle_status,
      created_at,
      current_revision:product_revisions!products_current_revision_id_fkey (
        revision_code,
        status,
        released_at
      )
    `,
  );

  if (queryValue) {
    const escapedQuery = queryValue.replaceAll(",", "\\,");
    productQuery = productQuery.or(
      `name.ilike.%${escapedQuery}%,product_code.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`,
    );
  }

  if (selectedStatus !== "all") {
    productQuery = productQuery.eq("lifecycle_status", selectedStatus);
  }

  const { data, error } = await productQuery.order("updated_at", {
    ascending: false,
  });

  const products = ((data ?? []) as ProductRow[]).map((product) => {
    const revision = normalizeRevision(product.current_revision);

    return {
      ...product,
      currentRevision: revision,
    };
  });

  const totalProducts = products.length;
  const releasedProducts = products.filter(
    (product) => product.lifecycle_status.toLowerCase() === "released",
  ).length;
  const reviewProducts = products.filter(
    (product) => product.lifecycle_status.toLowerCase() === "review",
  ).length;
  const trackedCategories = new Set(
    products
      .map((product) => product.category?.trim())
      .filter((category): category is string => Boolean(category)),
  ).size;

  return (
    <main className="space-y-6">
      <section className="rounded-[1.9rem] border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
              Product data
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">
              Product catalog
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              View current products with lifecycle status, active revision, and release
              dates.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[27rem]">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total products
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {formatCount(totalProducts)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Released
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {formatCount(releasedProducts)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                In review
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {formatCount(reviewProducts)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label={error ? "connection issue" : "live catalog"}
                tone={error ? "warning" : "success"}
              />
              <p className="text-sm text-slate-600">
                {error
                  ? "Product records are temporarily unavailable."
                  : "Catalog data is up to date."}
              </p>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-slate-900 bg-slate-900 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200">
              Category spread
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              {formatCount(trackedCategories)}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Distinct product categories currently represented in your records.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 border-b border-slate-900/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Catalog list</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Organization products
              </h2>
            </div>
          </div>

          <form className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]" method="get">
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
              defaultValue={queryValue}
              name="q"
              placeholder="Search by name, code, or category"
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
              href="/products"
            >
              Reset
            </Link>
          </form>

          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
            Showing {formatCount(products.length)} matching products
          </p>

          <div className="mt-5">
            <DataTable
              columns={[
                {
                  key: "product",
                  header: "Product",
                  render: (row) => (
                    <div>
                      <Link
                        className="font-semibold text-slate-950 transition hover:text-teal-700"
                        href={`/products/${row.id}`}
                      >
                        {row.name}
                      </Link>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {row.product_code}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "category",
                  header: "Category",
                  render: (row) => row.category || "Unassigned",
                },
                {
                  key: "lifecycle",
                  header: "Lifecycle",
                  render: (row) => (
                    <StatusBadge
                      label={row.lifecycle_status.replaceAll("_", " ")}
                      tone={getLifecycleTone(row.lifecycle_status)}
                    />
                  ),
                },
                {
                  key: "revision",
                  header: "Current revision",
                  render: (row) => (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {row.currentRevision?.revision_code ?? "None"}
                      </span>
                      {row.currentRevision ? (
                        <StatusBadge
                          label={row.currentRevision.status.replaceAll("_", " ")}
                          tone={getRevisionTone(row.currentRevision.status)}
                        />
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "release",
                  header: "Release date",
                  render: (row) => formatDate(row.currentRevision?.released_at ?? null),
                },
              ]}
              emptyState={
                error
                  ? "Products could not be loaded from Supabase."
                  : "No products found for this organization yet."
              }
              rows={products}
            />
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Catalog summary</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Select any product to review revision history, release timing, and record
            status.
          </p>
        </div>
      </section>
    </main>
  );
}
