"use client";

import { useTransition } from "react";

type AssigneeOption = {
  id: string;
  label: string;
};

export function ApprovalAssigneeSelect({
  action,
  approvalId,
  changeRequestId,
  currentAssigneeId,
  options,
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  approvalId: string;
  changeRequestId: string;
  currentAssigneeId: string | null;
  options: AssigneeOption[];
}>) {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={action} className="mt-2">
      <input name="approvalId" type="hidden" value={approvalId} />
      <input name="changeRequestId" type="hidden" value={changeRequestId} />
      <select
        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
        defaultValue={currentAssigneeId ?? ""}
        disabled={isPending}
        name="assigneeUserId"
        onChange={(event) => {
          const form = event.currentTarget.form;
          if (!form) {
            return;
          }

          startTransition(() => {
            form.requestSubmit();
          });
        }}
      >
        <option value="">Unassigned</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {isPending ? (
        <p className="mt-1 text-xs text-slate-500">Saving assignee...</p>
      ) : null}
    </form>
  );
}
