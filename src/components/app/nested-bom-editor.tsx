"use client";

import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";

export type BomSummary = {
  id: string;
  name: string;
  status: string;
  productCode: string;
  productName: string;
  revisionCode: string;
  itemCount: number;
};

export type PartOption = {
  revisionId: string;
  partNumber: string;
  partName: string;
  revisionCode: string;
  unitOfMeasure: string | null;
};

export type BomEditorItem = {
  id: string;
  bomId: string;
  parentId: string | null;
  partRevisionId: string;
  lineNumber: number;
  quantity: number;
  unitOfMeasure: string | null;
  referenceDesignator: string | null;
  notes: string | null;
};

type FlatRow = {
  item: BomEditorItem;
  depth: number;
};

function toNumeric(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.round(parsed * 1000) / 1000;
}

function createDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneItemsByBom(
  source: Record<string, BomEditorItem[]>,
): Record<string, BomEditorItem[]> {
  return Object.fromEntries(
    Object.entries(source).map(([bomId, items]) => [
      bomId,
      items.map((item) => ({ ...item })),
    ]),
  );
}

function flattenNestedRows(items: BomEditorItem[]) {
  const childrenByParent = new Map<string | null, BomEditorItem[]>();

  for (const item of items) {
    const key = item.parentId ?? null;
    const list = childrenByParent.get(key);

    if (list) {
      list.push(item);
    } else {
      childrenByParent.set(key, [item]);
    }
  }

  for (const children of childrenByParent.values()) {
    children.sort((left, right) => left.lineNumber - right.lineNumber);
  }

  const rows: FlatRow[] = [];

  function traverse(parentId: string | null, depth: number) {
    const children = childrenByParent.get(parentId) ?? [];

    for (const child of children) {
      rows.push({ item: child, depth });
      traverse(child.id, depth + 1);
    }
  }

  traverse(null, 0);
  return rows;
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

export function NestedBomEditor({
  boms,
  initialBomId,
  initialItemsByBom,
  partOptions,
}: Readonly<{
  boms: BomSummary[];
  initialBomId: string;
  initialItemsByBom: Record<string, BomEditorItem[]>;
  partOptions: PartOption[];
}>) {
  const [selectedBomId, setSelectedBomId] = useState(initialBomId);
  const [savedItemsByBom, setSavedItemsByBom] = useState(() =>
    cloneItemsByBom(initialItemsByBom),
  );
  const [itemsByBom, setItemsByBom] = useState(() =>
    cloneItemsByBom(initialItemsByBom),
  );
  const [dirtyByBom, setDirtyByBom] = useState<Record<string, boolean>>({});
  const [savedAtByBom, setSavedAtByBom] = useState<Record<string, string>>({});

  const selectedBom = boms.find((bom) => bom.id === selectedBomId) ?? null;
  const selectedItems = useMemo(
    () => itemsByBom[selectedBomId] ?? [],
    [itemsByBom, selectedBomId],
  );
  const flatRows = useMemo(() => flattenNestedRows(selectedItems), [selectedItems]);

  const partOptionByRevision = useMemo(
    () => new Map(partOptions.map((part) => [part.revisionId, part])),
    [partOptions],
  );

  const nestedCount = flatRows.filter((row) => row.depth > 0).length;
  const topLevelCount = flatRows.filter((row) => row.depth === 0).length;
  const selectedIsDirty = dirtyByBom[selectedBomId] ?? false;
  const lastSavedAt = savedAtByBom[selectedBomId] ?? null;

  function markDirty(bomId: string) {
    setDirtyByBom((previous) => ({
      ...previous,
      [bomId]: true,
    }));
  }

  function updateItem(itemId: string, patch: Partial<BomEditorItem>) {
    if (!selectedBomId) {
      return;
    }

    setItemsByBom((previous) => ({
      ...previous,
      [selectedBomId]: (previous[selectedBomId] ?? []).map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
    markDirty(selectedBomId);
  }

  function addItem(parentId: string | null) {
    if (!selectedBomId) {
      return;
    }

    const fallbackPart = partOptions[0];
    if (!fallbackPart) {
      return;
    }

    setItemsByBom((previous) => {
      const currentItems = previous[selectedBomId] ?? [];
      const maxLineNumber = currentItems.reduce(
        (highest, item) => Math.max(highest, item.lineNumber),
        0,
      );

      const nextItem: BomEditorItem = {
        id: createDraftId(),
        bomId: selectedBomId,
        parentId,
        partRevisionId: fallbackPart.revisionId,
        lineNumber: maxLineNumber + 10,
        quantity: 1,
        unitOfMeasure: fallbackPart.unitOfMeasure,
        referenceDesignator: null,
        notes: null,
      };

      return {
        ...previous,
        [selectedBomId]: [...currentItems, nextItem],
      };
    });
    markDirty(selectedBomId);
  }

  function removeItem(itemId: string) {
    if (!selectedBomId) {
      return;
    }

    setItemsByBom((previous) => {
      const currentItems = previous[selectedBomId] ?? [];
      const idsToRemove = new Set<string>([itemId]);
      let changed = true;

      while (changed) {
        changed = false;

        for (const item of currentItems) {
          if (item.parentId && idsToRemove.has(item.parentId) && !idsToRemove.has(item.id)) {
            idsToRemove.add(item.id);
            changed = true;
          }
        }
      }

      return {
        ...previous,
        [selectedBomId]: currentItems.filter((item) => !idsToRemove.has(item.id)),
      };
    });
    markDirty(selectedBomId);
  }

  function resetDraft() {
    if (!selectedBomId) {
      return;
    }

    setItemsByBom((previous) => ({
      ...previous,
      [selectedBomId]: (savedItemsByBom[selectedBomId] ?? []).map((item) => ({ ...item })),
    }));
    setDirtyByBom((previous) => ({
      ...previous,
      [selectedBomId]: false,
    }));
  }

  function saveDraft() {
    if (!selectedBomId) {
      return;
    }

    setSavedItemsByBom((previous) => ({
      ...previous,
      [selectedBomId]: (itemsByBom[selectedBomId] ?? []).map((item) => ({ ...item })),
    }));
    setDirtyByBom((previous) => ({
      ...previous,
      [selectedBomId]: false,
    }));
    setSavedAtByBom((previous) => ({
      ...previous,
      [selectedBomId]: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()),
    }));
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-[1.8rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-sm font-medium text-slate-500">BOM scope</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          Select BOM
        </h2>

        <select
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white"
          onChange={(event) => setSelectedBomId(event.target.value)}
          value={selectedBomId}
        >
          {boms.map((bom) => (
            <option key={bom.id} value={bom.id}>
              {bom.name}
            </option>
          ))}
        </select>

        {selectedBom ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Product
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {selectedBom.productName}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {selectedBom.productCode} / Rev {selectedBom.revisionCode}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Status
              </p>
              <div className="mt-2">
                <StatusBadge
                  label={selectedBom.status.replaceAll("_", " ")}
                  tone={getStatusTone(selectedBom.status)}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <button
            className="w-full rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
            disabled={!selectedBomId || !selectedIsDirty}
            onClick={saveDraft}
            type="button"
          >
            Save Draft
          </button>
          <button
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedBomId || !selectedIsDirty}
            onClick={resetDraft}
            type="button"
          >
            Reset Unsaved Edits
          </button>
          <button
            className="w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedBomId || partOptions.length === 0}
            onClick={() => addItem(null)}
            type="button"
          >
            Add Root Item
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {selectedIsDirty
            ? "You have unsaved BOM edits."
            : lastSavedAt
              ? `Last saved ${lastSavedAt}.`
              : "No draft changes for this BOM yet."}
        </p>
      </aside>

      <div className="rounded-[1.8rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-slate-900/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Editor canvas</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Nested BOM structure
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:w-[20rem]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total
              </p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                {flatRows.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Top level
              </p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                {topLevelCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Nested
              </p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                {nestedCount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {flatRows.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
              No BOM items yet. Add a root item to begin building this structure.
            </div>
          ) : (
            flatRows.map(({ item, depth }) => {
              const part = partOptionByRevision.get(item.partRevisionId);

              return (
                <article
                  key={item.id}
                  className="grid gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.5fr)_100px_96px_120px_88px_auto]"
                >
                  <div style={{ paddingLeft: `${depth * 16}px` }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Line {item.lineNumber}
                    </p>
                    <select
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500"
                      onChange={(event) => {
                        const nextPart = partOptionByRevision.get(event.target.value);
                        updateItem(item.id, {
                          partRevisionId: event.target.value,
                          unitOfMeasure: nextPart?.unitOfMeasure ?? item.unitOfMeasure,
                        });
                      }}
                      value={item.partRevisionId}
                    >
                      {partOptions.map((option) => (
                        <option key={option.revisionId} value={option.revisionId}>
                          {option.partNumber} - {option.partName} (Rev {option.revisionCode})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {part ? `Revision ${part.revisionCode}` : "Missing part revision"}
                    </p>
                  </div>

                  <label className="text-xs text-slate-500">
                    Qty
                    <input
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500"
                      min="0.001"
                      onChange={(event) =>
                        updateItem(item.id, {
                          quantity: toNumeric(event.target.value),
                        })
                      }
                      step="0.001"
                      type="number"
                      value={item.quantity}
                    />
                  </label>

                  <label className="text-xs text-slate-500">
                    UOM
                    <input
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500"
                      onChange={(event) =>
                        updateItem(item.id, {
                          unitOfMeasure: event.target.value || null,
                        })
                      }
                      type="text"
                      value={item.unitOfMeasure ?? ""}
                    />
                  </label>

                  <label className="text-xs text-slate-500">
                    RefDes
                    <input
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500"
                      onChange={(event) =>
                        updateItem(item.id, {
                          referenceDesignator: event.target.value || null,
                        })
                      }
                      type="text"
                      value={item.referenceDesignator ?? ""}
                    />
                  </label>

                  <label className="text-xs text-slate-500">
                    Notes
                    <input
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500"
                      onChange={(event) =>
                        updateItem(item.id, {
                          notes: event.target.value || null,
                        })
                      }
                      type="text"
                      value={item.notes ?? ""}
                    />
                  </label>

                  <div className="flex items-end justify-end gap-2">
                    <button
                      className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal-900 transition hover:bg-teal-100"
                      onClick={() => addItem(item.id)}
                      type="button"
                    >
                      Add child
                    </button>
                    <button
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-100"
                      onClick={() => removeItem(item.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
