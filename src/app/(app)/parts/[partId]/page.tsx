import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createPartRevision, deletePart, updatePart } from "@/app/(app)/parts/actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type PartRecord = {
  id: string;
  part_number: string;
  name: string;
  description: string | null;
  part_type: string | null;
  unit_of_measure: string | null;
  lifecycle_status: string;
  created_at: string;
  current_revision_id: string | null;
};

type PartRevision = {
  id: string;
  revision_code: string;
  status: string;
  summary: string | null;
  released_at: string | null;
  created_at: string;
};

type BomItemUsage = {
  id: string;
  bom_id: string;
  line_number: number;
  quantity: number;
  unit_of_measure: string | null;
};

type BomRecord = {
  id: string;
  name: string;
  status: string;
  product_revision_id: string;
};

type ProductRevisionRecord = {
  id: string;
  revision_code: string;
  product_id: string;
};

type ProductRecord = {
  id: string;
  name: string;
  product_code: string;
};

type LinkedUsage = {
  id: string;
  bomName: string;
  bomStatus: string;
  lineNumber: number;
  quantity: number;
  unitOfMeasure: string | null;
  productName: string;
  productCode: string;
  productRevisionCode: string;
};

const partPageRoles = ["admin", "engineer", "approver"] as const;
const partTypeOptions = ["assembly", "component", "subassembly", "raw_material"] as const;
const uomOptions = ["ea", "pcs", "kg", "g", "m", "mm", "l"] as const;

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

export default async function PartDetailPage({
  params,
}: Readonly<{
  params: Promise<{ partId: string }>;
}>) {
  const access = await getAuthenticatedAppContext();

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (access.status === "unauthorized") {
    redirect("/unauthorized");
  }

  if (!hasRoleAccess(access.user.role, partPageRoles)) {
    redirect("/unauthorized");
  }

  const { partId } = await params;
  const supabase = await createClient();

  const [{ data: part, error: partError }, { data: revisions, error: revisionsError }] =
    await Promise.all([
      supabase
        .from("parts")
        .select(
          `
            id,
            part_number,
            name,
            description,
            part_type,
            unit_of_measure,
            lifecycle_status,
            created_at,
            current_revision_id
          `,
        )
        .eq("id", partId)
        .maybeSingle<PartRecord>(),
      supabase
        .from("part_revisions")
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
        .eq("part_id", partId)
        .order("created_at", { ascending: false }),
    ]);

  if (partError) {
    throw new Error(partError.message);
  }

  if (!part) {
    notFound();
  }

  const partRevisions = (revisions ?? []) as PartRevision[];
  const currentRevision =
    partRevisions.find((revision) => revision.id === part.current_revision_id) ?? null;

  let linkedUsages: LinkedUsage[] = [];
  let usageError: string | null = null;

  if (currentRevision) {
    const { data: bomItems, error: bomItemsError } = await supabase
      .from("bom_items")
      .select(
        `
          id,
          bom_id,
          line_number,
          quantity,
          unit_of_measure
        `,
      )
      .eq("part_revision_id", currentRevision.id);

    if (bomItemsError) {
      usageError = bomItemsError.message;
    } else {
      const usageItems = (bomItems ?? []) as BomItemUsage[];
      const bomIds = Array.from(new Set(usageItems.map((item) => item.bom_id)));

      if (bomIds.length > 0) {
        const { data: boms, error: bomsError } = await supabase
          .from("boms")
          .select(
            `
              id,
              name,
              status,
              product_revision_id
            `,
          )
          .in("id", bomIds);

        if (bomsError) {
          usageError = bomsError.message;
        } else {
          const bomRecords = (boms ?? []) as BomRecord[];
          const productRevisionIds = Array.from(
            new Set(bomRecords.map((bom) => bom.product_revision_id)),
          );

          const { data: productRevisions, error: productRevisionsError } = await supabase
            .from("product_revisions")
            .select(
              `
                id,
                revision_code,
                product_id
              `,
            )
            .in("id", productRevisionIds);

          if (productRevisionsError) {
            usageError = productRevisionsError.message;
          } else {
            const revisionRecords = (productRevisions ?? []) as ProductRevisionRecord[];
            const productIds = Array.from(
              new Set(revisionRecords.map((revision) => revision.product_id)),
            );

            const { data: products, error: productsError } = await supabase
              .from("products")
              .select(
                `
                  id,
                  name,
                  product_code
                `,
              )
              .in("id", productIds);

            if (productsError) {
              usageError = productsError.message;
            } else {
              const bomMap = new Map(bomRecords.map((bom) => [bom.id, bom]));
              const revisionMap = new Map(
                revisionRecords.map((revision) => [revision.id, revision]),
              );
              const productMap = new Map(
                ((products ?? []) as ProductRecord[]).map((productRow) => [
                  productRow.id,
                  productRow,
                ]),
              );

              linkedUsages = usageItems
                .map((item) => {
                  const bom = bomMap.get(item.bom_id);
                  const productRevision = bom
                    ? revisionMap.get(bom.product_revision_id)
                    : undefined;
                  const productRow = productRevision
                    ? productMap.get(productRevision.product_id)
                    : undefined;

                  if (!bom || !productRevision || !productRow) {
                    return null;
                  }

                  return {
                    id: item.id,
                    bomName: bom.name,
                    bomStatus: bom.status,
                    lineNumber: item.line_number,
                    quantity: item.quantity,
                    unitOfMeasure: item.unit_of_measure,
                    productName: productRow.name,
                    productCode: productRow.product_code,
                    productRevisionCode: productRevision.revision_code,
                  };
                })
                .filter((item): item is LinkedUsage => Boolean(item));
            }
          }
        }
      }
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-900/10 bg-white/85 p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:text-slate-800"
              href="/parts"
            >
              Part library
            </Link>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              {part.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusBadge
                label={part.lifecycle_status.replaceAll("_", " ")}
                tone={getStatusTone(part.lifecycle_status)}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {part.part_number}
              </span>
              {part.part_type ? (
                <span className="rounded-full border border-slate-900/8 bg-[#f8f6f1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {part.part_type}
                </span>
              ) : null}
              {part.unit_of_measure ? (
                <span className="rounded-full border border-slate-900/8 bg-[#f8f6f1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {part.unit_of_measure}
                </span>
              ) : null}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              {part.description || "No part summary has been added yet."}
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
                {partRevisions.length}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-teal-900/10 bg-teal-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700">
                Linked usages
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {linkedUsages.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[1.5rem] border border-slate-900/8 bg-[#f8f6f1] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label={revisionsError ? "history unavailable" : "usage-aware record"}
                tone={revisionsError ? "warning" : "info"}
              />
              <p className="text-sm text-slate-600">
                {usageError
                  ? "Linked BOM usage is temporarily unavailable."
                  : "Revision history and linked usage are available for this part."}
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-900/8 bg-slate-950 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200">
              First recorded
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              {formatDateTime(part.created_at)}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Initial controlled record creation date for this part item.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="mb-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Create revision</p>
              <form action={createPartRevision} className="mt-4 space-y-3">
                <input name="partId" type="hidden" value={part.id} />
                <input
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                  name="revisionCode"
                  placeholder="Revision code (A, B, R1...)"
                  required
                  type="text"
                />
                <select
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                  defaultValue="draft"
                  name="status"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="released">Released</option>
                </select>
                <textarea
                  className="block min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                  name="summary"
                  placeholder="Revision summary"
                />
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    defaultChecked={part.current_revision_id === null}
                    name="setAsCurrent"
                    type="checkbox"
                  />
                  Set as current revision
                </label>
                <button
                  className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                  type="submit"
                >
                  Create revision
                </button>
              </form>
            </div>

            <div className="border-b border-slate-900/8 pb-5">
              <p className="text-sm font-medium text-slate-500">Revision history</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Controlled part revisions
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              {partRevisions.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-900/12 bg-[#f8f6f1] p-6 text-sm text-slate-500">
                  No revisions recorded for this part yet.
                </div>
              ) : (
                partRevisions.map((revision) => {
                  const isCurrent = revision.id === part.current_revision_id;

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
                            {isCurrent ? (
                              <StatusBadge label="current" tone="success" />
                            ) : null}
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

          <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="border-b border-slate-900/8 pb-5">
              <p className="text-sm font-medium text-slate-500">Linked usages</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Where this part is consumed
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              {usageError ? (
                <div className="rounded-[1.5rem] border border-dashed border-amber-900/20 bg-amber-50/70 p-6 text-sm text-amber-900">
                  BOM usage could not be loaded at this time.
                </div>
              ) : linkedUsages.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-900/12 bg-[#f8f6f1] p-6 text-sm text-slate-500">
                  No linked BOM usage found for the current revision.
                </div>
              ) : (
                linkedUsages.map((usage) => (
                  <article
                    key={usage.id}
                    className="rounded-[1.5rem] border border-slate-900/8 bg-[#f8f6f1] p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                          {usage.productName}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {usage.productCode} • Revision {usage.productRevisionCode}
                        </p>
                      </div>
                      <StatusBadge
                        label={usage.bomStatus.replaceAll("_", " ")}
                        tone={getStatusTone(usage.bomStatus)}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.25rem] border border-slate-900/8 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          BOM
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {usage.bomName}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-900/8 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Line
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {usage.lineNumber}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-900/8 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Quantity
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {usage.quantity} {usage.unitOfMeasure || ""}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Current release</p>
            <div className="mt-4 rounded-[1.25rem] border border-slate-900/8 bg-[#f8f6f1] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Active revision
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                {currentRevision
                  ? `Revision ${currentRevision.revision_code}`
                  : "No active revision"}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Release date {formatDate(currentRevision?.released_at ?? null)}
              </p>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Manage part</p>
            <form action={updatePart} className="mt-4 space-y-3">
              <input name="partId" type="hidden" value={part.id} />
              <input
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
                defaultValue={part.name}
                name="name"
                required
                type="text"
              />
              <select
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
                defaultValue={part.part_type ?? ""}
                name="partType"
              >
                <option value="">Select part type</option>
                {partTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <select
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
                defaultValue={part.unit_of_measure ?? ""}
                name="unitOfMeasure"
              >
                <option value="">Select UOM</option>
                {uomOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
                defaultValue={part.description ?? ""}
                name="description"
                placeholder="Description"
                type="text"
              />
              <select
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
                defaultValue={part.lifecycle_status}
                name="lifecycleStatus"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="released">Released</option>
              </select>
              <button
                className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                type="submit"
              >
                Save part
              </button>
            </form>
            <form action={deletePart} className="mt-3">
              <input name="partId" type="hidden" value={part.id} />
              <button
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
                type="submit"
              >
                Delete part
              </button>
            </form>
          </div>

          <div className="rounded-[1.9rem] border border-slate-900/10 bg-[#f8f6f1] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.25)]">
            <p className="text-sm font-medium text-slate-500">Record scope</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This record includes lifecycle status, revision timeline, and where the
              current revision is used.
            </p>
            <Link
              className="mt-5 inline-flex rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              href={`/changes/new?entityType=part&entityId=${part.id}`}
            >
              Create change request
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
