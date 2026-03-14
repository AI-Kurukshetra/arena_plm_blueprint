"use client";

import { useState } from "react";

import { DataTable } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { SelectField, TextField, TextareaField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";

const sampleRows = [
  {
    item: "NXG-2408 Controller",
    revision: "Rev C",
    owner: "Engineering",
    status: { label: "Released", tone: "success" as const },
  },
  {
    item: "PCB Assembly",
    revision: "Rev B",
    owner: "Operations",
    status: { label: "In review", tone: "warning" as const },
  },
  {
    item: "Battery Pack Spec",
    revision: "Rev A",
    owner: "Quality",
    status: { label: "Draft", tone: "info" as const },
  },
];

export function UiShowcase() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Product records</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                Recent controlled items
              </h2>
            </div>
            <button
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => setIsDrawerOpen(true)}
              type="button"
            >
              Open drawer
            </button>
          </div>

          <div className="mt-5">
            <DataTable
              columns={[
                {
                  key: "item",
                  header: "Item",
                  render: (row) => <span className="font-medium text-slate-900">{row.item}</span>,
                },
                {
                  key: "revision",
                  header: "Revision",
                  render: (row) => row.revision,
                },
                {
                  key: "owner",
                  header: "Owner",
                  render: (row) => row.owner,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <StatusBadge label={row.status.label} tone={row.status.tone} />
                  ),
                },
              ]}
              rows={sampleRows}
            />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
          <p className="text-sm font-medium text-slate-500">Status badges</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatusBadge label="Released" tone="success" />
            <StatusBadge label="Pending" tone="warning" />
            <StatusBadge label="Draft" tone="info" />
            <StatusBadge label="Blocked" tone="danger" />
            <StatusBadge label="Planned" tone="default" />
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
        <p className="text-sm font-medium text-slate-500">Record details</p>
        <div className="mt-5 space-y-4">
          <TextField
            defaultValue="NXG-2408 Controller"
            hint="Primary controlled item name."
            label="Product name"
            placeholder="Enter product name"
          />
          <SelectField
            defaultValue="engineering"
            hint="Owning team for this record."
            label="Owner team"
          >
            <option value="engineering">Engineering</option>
            <option value="operations">Operations</option>
            <option value="quality">Quality</option>
          </SelectField>
          <TextareaField
            defaultValue="Initial controlled record for the respiratory controller assembly."
            hint="Summary used during review and release."
            label="Summary"
          />
        </div>
      </div>

      <Drawer
        description="Side panel for product details and quick actions."
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        title="Product quick view"
      >
        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">NXG-2408 Controller</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">Revision C</p>
              </div>
              <StatusBadge label="Released" tone="success" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Ready for use in supplier packages and downstream release workflows.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Linked documents
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">14</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Open changes
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">3</p>
            </div>
          </div>
        </div>
      </Drawer>
    </section>
  );
}
