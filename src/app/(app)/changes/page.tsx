import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type ChangeRequestRow = {
  id: string;
  change_number: string;
  title: string;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  released_at: string | null;
  created_at: string;
};

type ApprovalRow = {
  id: string;
  change_request_id: string;
  step_order: number;
  step_name: string;
  status: string;
  assignee_user_id: string | null;
  decided_at: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type QueueScope = "all" | "mine" | "unassigned";
type QueueStatus = "open" | "approved" | "rejected" | "released" | "all";

type QueueRow = ChangeRequestRow & {
  nextApproval: ApprovalRow | null;
  pendingApprovals: number;
  completedApprovals: number;
  nextAssigneeLabel: string;
};

const approvalQueueRoles = ["admin", "approver"] as const;
const scopeOptions: QueueScope[] = ["all", "mine", "unassigned"];
const statusOptions: QueueStatus[] = ["open", "approved", "rejected", "released", "all"];

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
    case "pending":
      return "warning" as const;
    case "draft":
      return "info" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

function normalizeScope(value: string | string[] | undefined): QueueScope {
  return typeof value === "string" && scopeOptions.includes(value as QueueScope)
    ? (value as QueueScope)
    : "all";
}

function normalizeStatus(value: string | string[] | undefined): QueueStatus {
  return typeof value === "string" && statusOptions.includes(value as QueueStatus)
    ? (value as QueueStatus)
    : "open";
}

function buildFilterHref(scope: QueueScope, status: QueueStatus) {
  const params = new URLSearchParams();

  if (scope !== "all") {
    params.set("scope", scope);
  }

  if (status !== "open") {
    params.set("status", status);
  }

  const query = params.toString();
  return query ? `/changes?${query}` : "/changes";
}

function isOpenQueueItem(row: QueueRow) {
  return row.pendingApprovals > 0 && row.status.toLowerCase() !== "released";
}

export default async function ChangesPage({
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

  if (!hasRoleAccess(access.user.role, approvalQueueRoles)) {
    redirect("/unauthorized");
  }

  const resolvedParams = await searchParams;
  const scope = normalizeScope(resolvedParams.scope);
  const statusFilter = normalizeStatus(resolvedParams.status);

  const supabase = await createClient();
  const [
    { data: authData },
    { data: changeRequestsData, error: changeRequestsError },
    { data: approvalsData, error: approvalsError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("change_requests")
      .select(
        "id,change_number,title,status,submitted_at,approved_at,released_at,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select(
        "id,change_request_id,step_order,step_name,status,assignee_user_id,decided_at",
      )
      .order("step_order", { ascending: true }),
  ]);

  const currentUserId = authData.user?.id ?? null;
  const changeRequests = (changeRequestsData ?? []) as ChangeRequestRow[];
  const approvals = (approvalsData ?? []) as ApprovalRow[];

  const assigneeIds = Array.from(
    new Set(
      approvals
        .map((approval) => approval.assignee_user_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const { data: assigneeData, error: assigneeError } = assigneeIds.length
    ? await supabase
        .from("users")
        .select("id,full_name,email")
        .in("id", assigneeIds)
    : { data: [], error: null };

  const assigneeMap = new Map(
    ((assigneeData ?? []) as UserRow[]).map((user) => [
      user.id,
      user.full_name || user.email || "Approver",
    ]),
  );

  const approvalsByChangeId = new Map<string, ApprovalRow[]>();
  for (const approval of approvals) {
    const rows = approvalsByChangeId.get(approval.change_request_id) ?? [];
    rows.push(approval);
    approvalsByChangeId.set(approval.change_request_id, rows);
  }

  const queueRows = changeRequests.map((changeRequest) => {
    const approvalRows = approvalsByChangeId.get(changeRequest.id) ?? [];
    const nextApproval =
      approvalRows.find((approval) => approval.status.toLowerCase() === "pending") ?? null;
    const pendingApprovals = approvalRows.filter(
      (approval) => approval.status.toLowerCase() === "pending",
    ).length;
    const completedApprovals = approvalRows.filter(
      (approval) => approval.status.toLowerCase() !== "pending",
    ).length;

    return {
      ...changeRequest,
      nextApproval,
      pendingApprovals,
      completedApprovals,
      nextAssigneeLabel: nextApproval?.assignee_user_id
        ? (assigneeMap.get(nextApproval.assignee_user_id) ?? "Assigned approver")
        : "Unassigned",
    } satisfies QueueRow;
  });

  const filteredRows = queueRows.filter((row) => {
    if (scope === "mine") {
      if (!currentUserId || row.nextApproval?.assignee_user_id !== currentUserId) {
        return false;
      }
    }

    if (scope === "unassigned" && row.nextApproval?.assignee_user_id) {
      return false;
    }

    switch (statusFilter) {
      case "open":
        return isOpenQueueItem(row);
      case "approved":
        return row.status.toLowerCase() === "approved";
      case "rejected":
        return row.status.toLowerCase() === "rejected";
      case "released":
        return row.status.toLowerCase() === "released";
      case "all":
        return true;
      default:
        return true;
    }
  });

  const openCount = queueRows.filter(isOpenQueueItem).length;
  const assignedToMeCount = currentUserId
    ? queueRows.filter((row) => row.nextApproval?.assignee_user_id === currentUserId).length
    : 0;
  const unassignedCount = queueRows.filter(
    (row) => isOpenQueueItem(row) && !row.nextApproval?.assignee_user_id,
  ).length;
  const releasedCount = queueRows.filter(
    (row) => row.status.toLowerCase() === "released",
  ).length;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[2.2rem] border border-slate-900/10 bg-[linear-gradient(135deg,#f5f1e8_0%,#ffffff_45%,#eef6f3_100%)] p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.45)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
              Execution
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              Approval queue
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Prioritize open approvals, surface unassigned steps, and move accepted changes
              toward release.
            </p>
          </div>
          <Link
            className="inline-flex rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/changes/new"
          >
            New change request
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Open approvals
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {openCount}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-sky-900/10 bg-sky-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              Assigned to me
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {assignedToMeCount}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-amber-900/10 bg-amber-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Unassigned
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {unassignedCount}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-emerald-900/10 bg-emerald-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Released
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {releasedCount}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Filters
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Queue focus
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
              {scopeOptions.map((option) => {
                const isActive = scope === option;
                const label =
                  option === "all"
                    ? "All"
                    : option === "mine"
                      ? "Assigned to me"
                      : "Unassigned";

                return (
                  <Link
                    key={option}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                    href={buildFilterHref(option, statusFilter)}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const isActive = statusFilter === option;
                const label = option === "open" ? "Open" : option;

                return (
                  <Link
                    key={option}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                      isActive
                        ? "border-teal-800 bg-teal-800 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                    href={buildFilterHref(scope, option)}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <DataTable
            columns={[
              {
                key: "change_number",
                header: "Change",
                render: (row) => (
                  <div>
                    <Link
                      className="font-semibold text-slate-950 transition hover:text-teal-700"
                      href={`/changes/${row.id}`}
                    >
                      {row.change_number}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">{row.title}</p>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <StatusBadge
                    label={row.status.replaceAll("_", " ")}
                    tone={getStatusTone(row.status)}
                  />
                ),
              },
              {
                key: "next_step",
                header: "Next step",
                render: (row) =>
                  row.nextApproval ? (
                    <div>
                      <p className="font-medium text-slate-900">{row.nextApproval.step_name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        Step {row.nextApproval.step_order}
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-500">No pending step</span>
                  ),
              },
              {
                key: "assignee",
                header: "Assignee",
                render: (row) => row.nextAssigneeLabel,
              },
              {
                key: "pending",
                header: "Pending",
                render: (row) => row.pendingApprovals,
              },
              {
                key: "submitted",
                header: "Submitted",
                render: (row) => formatDate(row.submitted_at),
              },
              {
                key: "released",
                header: "Released",
                render: (row) => formatDate(row.released_at),
              },
            ]}
            emptyState={
              changeRequestsError || approvalsError || assigneeError
                ? "Approval queue could not be loaded from Supabase."
                : "No change requests match the current queue filters."
            }
            rows={filteredRows}
          />
        </div>
      </section>
    </main>
  );
}
