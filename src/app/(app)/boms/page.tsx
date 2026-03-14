import Link from "next/link";
import { redirect } from "next/navigation";

import {
  NestedBomEditor,
  type BomEditorItem,
  type BomSummary,
  type PartOption,
} from "@/components/app/nested-bom-editor";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type BomRecord = {
  id: string;
  name: string;
  status: string;
  product_revision_id: string;
};

type BomItemRecord = {
  id: string;
  bom_id: string;
  parent_bom_item_id: string | null;
  part_revision_id: string;
  line_number: number;
  quantity: number;
  unit_of_measure: string | null;
  reference_designator: string | null;
  notes: string | null;
};

type ProductRevisionRecord = {
  id: string;
  revision_code: string;
  product_id: string;
};

type ProductRecord = {
  id: string;
  product_code: string;
  name: string;
};

type PartRevisionRecord = {
  id: string;
  part_id: string;
  revision_code: string;
};

type PartRecord = {
  id: string;
  part_number: string;
  name: string;
  unit_of_measure: string | null;
};

const bomPageRoles = ["admin", "engineer", "approver"] as const;
const statusFilterOptions = ["all", "draft", "review", "released"] as const;

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export default async function BomsPage({
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

  if (!hasRoleAccess(access.user.role, bomPageRoles)) {
    redirect("/unauthorized");
  }

  const resolvedSearchParams = await searchParams;
  const queryValueRaw = resolvedSearchParams.q;
  const statusValueRaw = resolvedSearchParams.status;
  const queryValue =
    typeof queryValueRaw === "string" ? queryValueRaw.trim() : "";
  const selectedStatus =
    typeof statusValueRaw === "string" &&
    statusFilterOptions.includes(statusValueRaw as (typeof statusFilterOptions)[number])
      ? statusValueRaw
      : "all";

  const supabase = await createClient();

  const [
    { data: bomData, error: bomsError },
    { data: partRevisionData, error: partRevisionsError },
  ] = await Promise.all([
    (() => {
      let bomQuery = supabase
        .from("boms")
        .select("id,name,status,product_revision_id");

      if (queryValue) {
        const escapedQuery = queryValue.replaceAll(",", "\\,");
        bomQuery = bomQuery.ilike("name", `%${escapedQuery}%`);
      }

      if (selectedStatus !== "all") {
        bomQuery = bomQuery.eq("status", selectedStatus);
      }

      return bomQuery.order("updated_at", { ascending: false });
    })(),
    supabase.from("part_revisions").select("id,part_id,revision_code").order("created_at", {
      ascending: false,
    }),
  ]);

  const boms = (bomData ?? []) as BomRecord[];
  const partRevisions = (partRevisionData ?? []) as PartRevisionRecord[];
  const bomIds = boms.map((bom) => bom.id);
  const productRevisionIds = Array.from(new Set(boms.map((bom) => bom.product_revision_id)));
  const partIds = Array.from(new Set(partRevisions.map((revision) => revision.part_id)));

  const [
    { data: bomItemsData, error: bomItemsError },
    { data: productRevisionData, error: productRevisionsError },
  ] = await Promise.all([
    bomIds.length > 0
      ? supabase
          .from("bom_items")
          .select(
            "id,bom_id,parent_bom_item_id,part_revision_id,line_number,quantity,unit_of_measure,reference_designator,notes",
          )
          .in("bom_id", bomIds)
      : Promise.resolve({ data: [], error: null }),
    productRevisionIds.length > 0
      ? supabase
          .from("product_revisions")
          .select("id,revision_code,product_id")
          .in("id", productRevisionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const bomItems = (bomItemsData ?? []) as BomItemRecord[];
  const productRevisions = (productRevisionData ?? []) as ProductRevisionRecord[];
  const productIds = Array.from(
    new Set(productRevisions.map((productRevision) => productRevision.product_id)),
  );

  const [{ data: productData, error: productsError }, { data: partData, error: partsError }] =
    await Promise.all([
      productIds.length > 0
        ? supabase.from("products").select("id,product_code,name").in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      partIds.length > 0
        ? supabase.from("parts").select("id,part_number,name,unit_of_measure").in("id", partIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const products = (productData ?? []) as ProductRecord[];
  const parts = (partData ?? []) as PartRecord[];

  const productRevisionById = new Map(productRevisions.map((revision) => [revision.id, revision]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const partById = new Map(parts.map((part) => [part.id, part]));

  const itemCountByBom = new Map<string, number>();
  for (const item of bomItems) {
    itemCountByBom.set(item.bom_id, (itemCountByBom.get(item.bom_id) ?? 0) + 1);
  }

  const bomSummaries: BomSummary[] = boms.map((bom) => {
    const productRevision = productRevisionById.get(bom.product_revision_id);
    const product = productRevision ? productById.get(productRevision.product_id) : null;

    return {
      id: bom.id,
      name: bom.name,
      status: bom.status,
      productCode: product?.product_code ?? "Unknown",
      productName: product?.name ?? "Unknown product",
      revisionCode: productRevision?.revision_code ?? "N/A",
      itemCount: itemCountByBom.get(bom.id) ?? 0,
    };
  });

  const partOptions: PartOption[] = partRevisions.map((revision) => {
    const part = partById.get(revision.part_id);

    return {
      revisionId: revision.id,
      partNumber: part?.part_number ?? "Unknown",
      partName: part?.name ?? "Missing part",
      revisionCode: revision.revision_code,
      unitOfMeasure: part?.unit_of_measure ?? null,
    };
  });

  const initialItemsByBom: Record<string, BomEditorItem[]> = Object.fromEntries(
    bomIds.map((bomId) => [bomId, []]),
  );

  for (const item of bomItems) {
    if (!initialItemsByBom[item.bom_id]) {
      initialItemsByBom[item.bom_id] = [];
    }

    initialItemsByBom[item.bom_id].push({
      id: item.id,
      bomId: item.bom_id,
      parentId: item.parent_bom_item_id,
      partRevisionId: item.part_revision_id,
      lineNumber: item.line_number,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure,
      referenceDesignator: item.reference_designator,
      notes: item.notes,
    });
  }

  const activeBomCount = bomSummaries.filter(
    (bom) => bom.status.toLowerCase() === "draft" || bom.status.toLowerCase() === "review",
  ).length;
  const totalBomItems = bomItems.length;

  const hasDataIssue =
    Boolean(bomsError) ||
    Boolean(bomItemsError) ||
    Boolean(productRevisionsError) ||
    Boolean(productsError) ||
    Boolean(partRevisionsError) ||
    Boolean(partsError);

  return (
    <main className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-900/10 bg-white/85 p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
              Product data
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              Nested BOM editor
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Build and maintain multi-level product structures with controlled BOM
              line items for each product revision.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f6f1] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Total BOMs
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(bomSummaries.length)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-900/10 bg-amber-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                Active BOMs
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(activeBomCount)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-900/10 bg-emerald-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Total items
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatCount(totalBomItems)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-900/8 bg-[#f8f6f1] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={hasDataIssue ? "connection issue" : "editor ready"}
              tone={hasDataIssue ? "warning" : "success"}
            />
            <p className="text-sm text-slate-600">
              {hasDataIssue
                ? "Some BOM data could not be loaded from Supabase."
                : "BOM structures are loaded and ready for editing."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-900/8 bg-white/85 p-5">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]" method="get">
          <input
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
            defaultValue={queryValue}
            name="q"
            placeholder="Search BOMs by name"
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
            href="/boms"
          >
            Reset
          </Link>
        </form>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
          Showing {formatCount(bomSummaries.length)} matching BOMs
        </p>
      </section>

      {bomSummaries.length === 0 ? (
        <section className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          No BOMs exist for this organization yet. Create a product revision BOM record to
          start using the nested editor.
        </section>
      ) : partOptions.length === 0 ? (
        <section className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          BOMs are available, but no part revisions were found to assign line items.
        </section>
      ) : (
        <NestedBomEditor
          boms={bomSummaries}
          initialBomId={bomSummaries[0]?.id ?? ""}
          initialItemsByBom={initialItemsByBom}
          partOptions={partOptions}
        />
      )}
    </main>
  );
}
