import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  decideApproval,
  releaseChangeRequest,
  submitChangeRequest,
  updateApprovalAssignee,
} from "@/app/(app)/changes/actions";
import { ApprovalAssigneeSelect } from "@/components/app/approval-assignee-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type ChangeRequestRecord = {
  id: string;
  change_number: string;
  title: string;
  description: string | null;
  reason: string | null;
  impact_summary: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  released_at: string | null;
  created_at: string;
};

type ChangeItemRecord = {
  id: string;
  entity_type: string;
  entity_id: string;
  change_action: string;
  before_revision: string | null;
  after_revision: string | null;
  notes: string | null;
  created_at: string;
};

type ApprovalRecord = {
  id: string;
  step_order: number;
  step_name: string;
  status: string;
  decision: string | null;
  decision_notes: string | null;
  decided_at: string | null;
  assignee_user_id: string | null;
};

type UserRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

type ProductRecord = {
  id: string;
  product_code: string;
  name: string;
};

type PartRecord = {
  id: string;
  part_number: string;
  name: string;
};

const changeRoles = ["admin", "engineer", "approver"] as const;
const approvalDecisionRoles = ["admin", "approver"] as const;

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

function formatDecisionLabel(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return value.replaceAll("_", " ");
}

export default async function ChangeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ changeRequestId: string }>;
}>) {
  const access = await getAuthenticatedAppContext();

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (access.status === "unauthorized") {
    redirect("/unauthorized");
  }

  if (!hasRoleAccess(access.user.role, changeRoles)) {
    redirect("/unauthorized");
  }
  const canDecideApproval = hasRoleAccess(access.user.role, approvalDecisionRoles);

  const { changeRequestId } = await params;
  const supabase = await createClient();

  const [{ data: changeRequest, error: changeError }, { data: changeItems, error: itemsError }, { data: approvals, error: approvalsError }] =
    await Promise.all([
      supabase
        .from("change_requests")
        .select(
          "id,change_number,title,description,reason,impact_summary,status,submitted_at,approved_at,released_at,created_at",
        )
        .eq("id", changeRequestId)
        .maybeSingle<ChangeRequestRecord>(),
      supabase
        .from("change_items")
        .select(
          "id,entity_type,entity_id,change_action,before_revision,after_revision,notes,created_at",
        )
        .eq("change_request_id", changeRequestId)
        .order("created_at", { ascending: true }),
      supabase
        .from("approvals")
        .select(
          "id,step_order,step_name,status,decision,decision_notes,decided_at,assignee_user_id",
        )
        .eq("change_request_id", changeRequestId)
        .order("step_order", { ascending: true }),
    ]);

  if (changeError) {
    throw new Error(changeError.message);
  }

  if (!changeRequest) {
    notFound();
  }

  if (itemsError || approvalsError) {
    throw new Error(itemsError?.message || approvalsError?.message || "Failed to load change data");
  }

  const impactedItems = (changeItems ?? []) as ChangeItemRecord[];
  const approvalRows = (approvals ?? []) as ApprovalRecord[];

  const productIds = impactedItems
    .filter((item) => item.entity_type === "product")
    .map((item) => item.entity_id);
  const partIds = impactedItems
    .filter((item) => item.entity_type === "part")
    .map((item) => item.entity_id);
  const assigneeIds = approvalRows
    .map((item) => item.assignee_user_id)
    .filter((value): value is string => Boolean(value));

  const [{ data: products }, { data: parts }, { data: users }, { data: assigneeCandidates }] =
    await Promise.all([
    productIds.length > 0
      ? supabase.from("products").select("id,product_code,name").in("id", productIds)
      : Promise.resolve({ data: [] }),
    partIds.length > 0
      ? supabase.from("parts").select("id,part_number,name").in("id", partIds)
      : Promise.resolve({ data: [] }),
    assigneeIds.length > 0
      ? supabase.from("users").select("id,full_name,email,role").in("id", assigneeIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("users")
      .select("id,full_name,email,role")
      .in("role", ["admin", "approver"])
      .order("full_name", { ascending: true }),
    ]);

  const productMap = new Map(((products ?? []) as ProductRecord[]).map((row) => [row.id, row]));
  const partMap = new Map(((parts ?? []) as PartRecord[]).map((row) => [row.id, row]));
  const userMap = new Map(((users ?? []) as UserRecord[]).map((row) => [row.id, row]));
  const assigneeOptions = (assigneeCandidates ?? []) as UserRecord[];
  const pendingApprovalCount = approvalRows.filter(
    (approval) => approval.status.toLowerCase() === "pending",
  ).length;
  const approvedStepCount = approvalRows.filter(
    (approval) => approval.status.toLowerCase() === "approved",
  ).length;
  const rejectedStepCount = approvalRows.filter(
    (approval) => approval.status.toLowerCase() === "rejected",
  ).length;
  const nextApproval =
    approvalRows.find((approval) => approval.status.toLowerCase() === "pending") ?? null;
  const uniqueProductCount = new Set(
    impactedItems
      .filter((item) => item.entity_type === "product")
      .map((item) => item.entity_id),
  ).size;
  const uniquePartCount = new Set(
    impactedItems
      .filter((item) => item.entity_type === "part")
      .map((item) => item.entity_id),
  ).size;
  const nextAssignee = nextApproval?.assignee_user_id
    ? userMap.get(nextApproval.assignee_user_id)
    : null;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-[linear-gradient(145deg,#f5f1e8_0%,#ffffff_45%,#edf7f1_100%)] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 transition hover:text-slate-800"
              href="/changes"
            >
              Approval queue
            </Link>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              {changeRequest.change_number}
            </h1>
            <p className="mt-2 text-lg text-slate-700">{changeRequest.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={changeRequest.status.replaceAll("_", " ")}
              tone={getStatusTone(changeRequest.status)}
            />
            {changeRequest.status.toLowerCase() === "draft" ? (
              <form action={submitChangeRequest}>
                <input name="changeRequestId" type="hidden" value={changeRequest.id} />
                <button
                  className="rounded-xl border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                  type="submit"
                >
                  Submit
                </button>
              </form>
            ) : null}
            {canDecideApproval && changeRequest.status.toLowerCase() === "approved" ? (
              <form action={releaseChangeRequest}>
                <input name="changeRequestId" type="hidden" value={changeRequest.id} />
                <button
                  className="rounded-xl border border-emerald-700 bg-emerald-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                  type="submit"
                >
                  Release
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Submitted
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(changeRequest.submitted_at)}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Approved
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(changeRequest.approved_at)}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Released
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(changeRequest.released_at)}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-amber-900/10 bg-amber-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Pending steps
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{pendingApprovalCount}</p>
          </div>
          <div className="rounded-[1.25rem] border border-sky-900/10 bg-sky-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Impacted items
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{impactedItems.length}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/80 p-5 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Change brief
            </p>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Description
                </dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">
                  {changeRequest.description || "No detailed description provided."}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Reason
                </dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">
                  {changeRequest.reason || "No change reason captured."}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Impact summary
                </dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">
                  {changeRequest.impact_summary || "No downstream impact summary captured yet."}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_24px_70px_-55px_rgba(15,23,42,0.65)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Decision state
            </p>
            {nextApproval ? (
              <>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Awaiting step {nextApproval.step_order}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {nextApproval.step_name} is the next required decision.
                  {" "}
                  {nextAssignee
                    ? `Assigned to ${nextAssignee.full_name || nextAssignee.email || "approver"}.`
                    : "No approver is assigned yet."}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Workflow currently settled
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  No pending approval steps remain for this change request.
                </p>
              </>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Approved steps
                </p>
                <p className="mt-2 text-lg font-semibold">{approvedStepCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Rejected steps
                </p>
                <p className="mt-2 text-lg font-semibold">{rejectedStepCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Record mix
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {uniqueProductCount}P / {uniquePartCount}T
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[1.8rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-medium text-slate-500">Impacted records</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Change items
          </h2>
          <div className="mt-5 space-y-3">
            {impactedItems.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No impacted records are linked to this change request.
              </p>
            ) : (
              impactedItems.map((item) => {
                const product = item.entity_type === "product" ? productMap.get(item.entity_id) : null;
                const part = item.entity_type === "part" ? partMap.get(item.entity_id) : null;
                const href =
                  item.entity_type === "product"
                    ? `/products/${item.entity_id}`
                    : item.entity_type === "part"
                      ? `/parts/${item.entity_id}`
                      : null;

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {item.entity_type === "product"
                            ? product
                              ? `${product.product_code} - ${product.name}`
                              : `Product ${item.entity_id}`
                            : part
                              ? `${part.part_number} - ${part.name}`
                              : `Part ${item.entity_id}`}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {item.entity_type} / {item.change_action}
                        </p>
                      </div>
                      {href ? (
                        <Link
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                          href={href}
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Before revision
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{item.before_revision || "N/A"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          After revision
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{item.after_revision || "TBD"}</p>
                      </div>
                    </div>
                    {item.notes ? (
                      <p className="mt-2 text-sm text-slate-600">{item.notes}</p>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-900/10 bg-white/88 p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-medium text-slate-500">Decisions</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Approval steps
          </h2>
          <div className="mt-5 space-y-3">
            {approvalRows.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No approval steps are recorded yet.
              </p>
            ) : (
              approvalRows.map((approval) => {
                const assignee = approval.assignee_user_id
                  ? userMap.get(approval.assignee_user_id)
                  : null;

                return (
                  <article
                    key={approval.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        Step {approval.step_order}: {approval.step_name}
                      </p>
                      <StatusBadge
                        label={approval.status.replaceAll("_", " ")}
                        tone={getStatusTone(approval.status)}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Assignee: {assignee?.full_name || assignee?.email || "Unassigned"}
                    </p>
                    {canDecideApproval && approval.status.toLowerCase() === "pending" ? (
                      <ApprovalAssigneeSelect
                        action={updateApprovalAssignee}
                        approvalId={approval.id}
                        changeRequestId={changeRequest.id}
                        currentAssigneeId={approval.assignee_user_id}
                        options={assigneeOptions.map((candidate) => ({
                          id: candidate.id,
                          label: candidate.full_name || candidate.email || candidate.id,
                        }))}
                      />
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Decision
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {formatDecisionLabel(approval.decision)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Decided
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {formatDate(approval.decided_at)}
                        </p>
                      </div>
                    </div>
                    {approval.decision_notes ? (
                      <p className="mt-2 text-sm text-slate-600">{approval.decision_notes}</p>
                    ) : null}
                    {canDecideApproval && approval.status.toLowerCase() === "pending" ? (
                      <form action={decideApproval} className="mt-3 space-y-2">
                        <input name="approvalId" type="hidden" value={approval.id} />
                        <input name="changeRequestId" type="hidden" value={changeRequest.id} />
                        <textarea
                          className="block min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                          name="decisionNotes"
                          placeholder="Decision notes (optional)"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"
                            name="decision"
                            type="submit"
                            value="approved"
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700"
                            name="decision"
                            type="submit"
                            value="rejected"
                          >
                            Reject
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
