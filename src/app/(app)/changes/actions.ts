"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type UserProfileRow = {
  organization_id: string | null;
};

type ChangeActorContext = {
  organizationId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

type ChangeItemRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  after_revision: string | null;
};

type ParentRecord = {
  id: string;
  current_revision_id: string | null;
};

type RevisionRecord = {
  id: string;
  revision_code: string;
  status: string;
};

const changeRoles = ["admin", "engineer", "approver"] as const;
const approvalDecisionRoles = ["admin", "approver"] as const;

function formatDateToken(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function generateChangeNumber() {
  const dateToken = formatDateToken(new Date());
  const randomToken = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CR-${dateToken}-${randomToken}`;
}

async function getChangeActorContext(
  allowedRoles: readonly (typeof changeRoles)[number][],
): Promise<ChangeActorContext> {
  const access = await getAuthenticatedAppContext();

  if (access.status !== "authorized") {
    throw new Error("Unauthorized");
  }

  if (!hasRoleAccess(access.user.role, allowedRoles)) {
    throw new Error("Forbidden");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  if (!profile?.organization_id) {
    throw new Error("Missing organization");
  }

  return {
    organizationId: profile.organization_id,
    supabase,
    userId: user.id,
  };
}

export async function createChangeRequest(
  _previousState: unknown,
  formData: FormData,
): Promise<{
  status: "idle" | "success" | "error";
  message: string | null;
  changeRequestId?: string;
  changeNumber?: string;
}> {
  const access = await getAuthenticatedAppContext();

  if (access.status !== "authorized") {
    return {
      status: "error",
      message: "You need an active session to create a change request.",
    };
  }

  if (!hasRoleAccess(access.user.role, changeRoles)) {
    return {
      status: "error",
      message: "Your role does not have access to create change requests.",
    };
  }

  const entityType = formData.get("entityType");
  const entityId = formData.get("entityId");
  const titleInput = formData.get("title");
  const descriptionInput = formData.get("description");
  const reasonInput = formData.get("reason");
  const impactSummaryInput = formData.get("impactSummary");
  const beforeRevisionInput = formData.get("beforeRevision");

  if (entityType !== "product" && entityType !== "part") {
    return {
      status: "error",
      message: "Change request context is invalid. Start from product or part detail.",
    };
  }

  if (typeof entityId !== "string" || !entityId.trim()) {
    return {
      status: "error",
      message: "Entity identifier is missing from the request context.",
    };
  }

  if (typeof titleInput !== "string" || !titleInput.trim()) {
    return {
      status: "error",
      message: "Title is required.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Unable to resolve signed-in user.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  if (profileError || !profile?.organization_id) {
    return {
      status: "error",
      message: "User organization profile is not available.",
    };
  }

  const title = titleInput.trim();
  const description = typeof descriptionInput === "string" ? descriptionInput.trim() : "";
  const reason = typeof reasonInput === "string" ? reasonInput.trim() : "";
  const impactSummary =
    typeof impactSummaryInput === "string" ? impactSummaryInput.trim() : "";
  const beforeRevision =
    typeof beforeRevisionInput === "string" && beforeRevisionInput.trim().length > 0
      ? beforeRevisionInput.trim()
      : null;

  let createdRequest:
    | {
        id: string;
        change_number: string;
      }
    | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const changeNumber = generateChangeNumber();

    const { data, error } = await supabase
      .from("change_requests")
      .insert({
        organization_id: profile.organization_id,
        change_number: changeNumber,
        title,
        description: description || null,
        reason: reason || null,
        impact_summary: impactSummary || null,
        status: "draft",
        requested_by: user.id,
      })
      .select("id,change_number")
      .maybeSingle<{ id: string; change_number: string }>();

    if (error) {
      if (error.code === "23505") {
        continue;
      }

      return {
        status: "error",
        message: `Change request could not be created: ${error.message}`,
      };
    }

    if (data) {
      createdRequest = data;
      break;
    }
  }

  if (!createdRequest) {
    return {
      status: "error",
      message: "Could not generate a unique change number. Please retry.",
    };
  }

  const { error: itemError } = await supabase.from("change_items").insert({
    organization_id: profile.organization_id,
    change_request_id: createdRequest.id,
    entity_type: entityType,
    entity_id: entityId.trim(),
    change_action: "update",
    before_revision: beforeRevision,
    after_revision: null,
    notes: null,
  });

  if (itemError) {
    return {
      status: "error",
      message: `Change request was created but initial change item failed: ${itemError.message}`,
      changeRequestId: createdRequest.id,
      changeNumber: createdRequest.change_number,
    };
  }

  if (entityType === "product") {
    revalidatePath(`/products/${entityId}`);
  }

  if (entityType === "part") {
    revalidatePath(`/parts/${entityId}`);
  }

  revalidatePath("/changes/new");

  return {
    status: "success",
    message: `Change request ${createdRequest.change_number} created successfully.`,
    changeRequestId: createdRequest.id,
    changeNumber: createdRequest.change_number,
  };
}

export async function decideApproval(formData: FormData) {
  const access = await getAuthenticatedAppContext();

  if (access.status !== "authorized") {
    throw new Error("Unauthorized");
  }

  if (!hasRoleAccess(access.user.role, approvalDecisionRoles)) {
    throw new Error("Forbidden");
  }

  const approvalId = String(formData.get("approvalId") ?? "").trim();
  const changeRequestId = String(formData.get("changeRequestId") ?? "").trim();
  const decisionInput = String(formData.get("decision") ?? "").trim().toLowerCase();
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim();
  const hasAssigneeField = formData.has("assigneeUserId");
  const assigneeUserIdInput = hasAssigneeField
    ? String(formData.get("assigneeUserId") ?? "").trim()
    : "";

  if (!approvalId || !changeRequestId) {
    throw new Error("approvalId and changeRequestId are required");
  }

  if (decisionInput !== "approved" && decisionInput !== "rejected") {
    throw new Error("decision must be approved or rejected");
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  if (!profile?.organization_id) {
    throw new Error("Missing organization");
  }

  let assigneeUserIdUpdate: string | null | undefined;
  if (hasAssigneeField) {
    assigneeUserIdUpdate = null;

    if (assigneeUserIdInput) {
      const { data: assigneeUser, error: assigneeError } = await supabase
        .from("users")
        .select("id,role")
        .eq("organization_id", profile.organization_id)
        .eq("id", assigneeUserIdInput)
        .maybeSingle<{ id: string; role: string }>();

      if (assigneeError || !assigneeUser) {
        throw new Error("Invalid assignee selected");
      }

      const assigneeRole = assigneeUser.role.toLowerCase();
      if (assigneeRole !== "admin" && assigneeRole !== "approver") {
        throw new Error("Assignee must have admin or approver role");
      }

      assigneeUserIdUpdate = assigneeUser.id;
    }
  }

  const approvalUpdates: Record<string, string | null> = {
    status: decisionInput,
    decision: decisionInput,
    decision_notes: decisionNotes || null,
    decided_at: now,
  };
  if (assigneeUserIdUpdate !== undefined) {
    approvalUpdates.assignee_user_id = assigneeUserIdUpdate;
  }

  const { error: approvalError } = await supabase
    .from("approvals")
    .update(approvalUpdates)
    .eq("organization_id", profile.organization_id)
    .eq("id", approvalId)
    .eq("change_request_id", changeRequestId);

  if (approvalError) {
    throw new Error(approvalError.message);
  }

  const { data: approvals, error: approvalsError } = await supabase
    .from("approvals")
    .select("status")
    .eq("organization_id", profile.organization_id)
    .eq("change_request_id", changeRequestId);

  if (approvalsError) {
    throw new Error(approvalsError.message);
  }

  const statuses = (approvals ?? []).map((row) => row.status.toLowerCase());
  const hasRejected = statuses.includes("rejected");
  const allApproved = statuses.length > 0 && statuses.every((status) => status === "approved");

  const changeRequestUpdates: Record<string, string | null> = {};
  if (hasRejected) {
    changeRequestUpdates.status = "rejected";
    changeRequestUpdates.approved_at = null;
  } else if (allApproved) {
    changeRequestUpdates.status = "approved";
    changeRequestUpdates.approved_at = now;
  } else {
    changeRequestUpdates.status = "review";
    changeRequestUpdates.approved_at = null;
  }

  const { error: changeRequestError } = await supabase
    .from("change_requests")
    .update(changeRequestUpdates)
    .eq("organization_id", profile.organization_id)
    .eq("id", changeRequestId);

  if (changeRequestError) {
    throw new Error(changeRequestError.message);
  }

  revalidatePath("/changes");
  revalidatePath(`/changes/${changeRequestId}`);
  redirect(`/changes/${changeRequestId}`);
}

export async function updateApprovalAssignee(formData: FormData) {
  const access = await getAuthenticatedAppContext();

  if (access.status !== "authorized") {
    throw new Error("Unauthorized");
  }

  if (!hasRoleAccess(access.user.role, approvalDecisionRoles)) {
    throw new Error("Forbidden");
  }

  const approvalId = String(formData.get("approvalId") ?? "").trim();
  const changeRequestId = String(formData.get("changeRequestId") ?? "").trim();
  const assigneeUserIdInput = String(formData.get("assigneeUserId") ?? "").trim();

  if (!approvalId || !changeRequestId) {
    throw new Error("approvalId and changeRequestId are required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  if (!profile?.organization_id) {
    throw new Error("Missing organization");
  }

  let assigneeUserId: string | null = null;
  if (assigneeUserIdInput) {
    const { data: assigneeUser, error: assigneeError } = await supabase
      .from("users")
      .select("id,role")
      .eq("organization_id", profile.organization_id)
      .eq("id", assigneeUserIdInput)
      .maybeSingle<{ id: string; role: string }>();

    if (assigneeError || !assigneeUser) {
      throw new Error("Invalid assignee selected");
    }

    const assigneeRole = assigneeUser.role.toLowerCase();
    if (assigneeRole !== "admin" && assigneeRole !== "approver") {
      throw new Error("Assignee must have admin or approver role");
    }

    assigneeUserId = assigneeUser.id;
  }

  const { error } = await supabase
    .from("approvals")
    .update({ assignee_user_id: assigneeUserId })
    .eq("organization_id", profile.organization_id)
    .eq("id", approvalId)
    .eq("change_request_id", changeRequestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/changes");
  revalidatePath(`/changes/${changeRequestId}`);
  redirect(`/changes/${changeRequestId}`);
}

export async function submitChangeRequest(formData: FormData) {
  const { supabase, organizationId } = await getChangeActorContext(changeRoles);

  const changeRequestId = String(formData.get("changeRequestId") ?? "").trim();
  if (!changeRequestId) {
    throw new Error("changeRequestId is required");
  }

  const now = new Date().toISOString();

  const { data: changeRequest, error: changeRequestError } = await supabase
    .from("change_requests")
    .select("id,status")
    .eq("organization_id", organizationId)
    .eq("id", changeRequestId)
    .maybeSingle<{ id: string; status: string }>();

  if (changeRequestError || !changeRequest) {
    throw new Error(changeRequestError?.message || "Change request not found");
  }

  if (changeRequest.status.toLowerCase() !== "draft") {
    throw new Error("Only draft change requests can be submitted");
  }

  const { data: existingApprovals, error: approvalsError } = await supabase
    .from("approvals")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("change_request_id", changeRequestId)
    .limit(1);

  if (approvalsError) {
    throw new Error(approvalsError.message);
  }

  if (!existingApprovals || existingApprovals.length === 0) {
    const { error: insertApprovalError } = await supabase.from("approvals").insert({
      organization_id: organizationId,
      change_request_id: changeRequestId,
      workflow_step_id: null,
      step_order: 1,
      step_name: "Initial approval",
      assignee_user_id: null,
      status: "pending",
      decision: null,
      decision_notes: null,
      decided_at: null,
    });

    if (insertApprovalError) {
      throw new Error(insertApprovalError.message);
    }
  }

  const { error: updateError } = await supabase
    .from("change_requests")
    .update({
      status: "review",
      submitted_at: now,
      approved_at: null,
      released_at: null,
    })
    .eq("organization_id", organizationId)
    .eq("id", changeRequestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/changes");
  revalidatePath(`/changes/${changeRequestId}`);
  redirect(`/changes/${changeRequestId}`);
}

export async function releaseChangeRequest(formData: FormData) {
  const { supabase, organizationId, userId } = await getChangeActorContext(
    approvalDecisionRoles,
  );

  const changeRequestId = String(formData.get("changeRequestId") ?? "").trim();
  if (!changeRequestId) {
    throw new Error("changeRequestId is required");
  }

  const now = new Date().toISOString();
  const { data: changeRequest, error: changeRequestError } = await supabase
    .from("change_requests")
    .select("id,status")
    .eq("organization_id", organizationId)
    .eq("id", changeRequestId)
    .maybeSingle<{ id: string; status: string }>();

  if (changeRequestError || !changeRequest) {
    throw new Error(changeRequestError?.message || "Change request not found");
  }

  const currentStatus = changeRequest.status.toLowerCase();
  if (currentStatus === "released") {
    redirect(`/changes/${changeRequestId}`);
  }

  if (currentStatus !== "approved") {
    throw new Error("Only approved change requests can be released");
  }

  const { data: changeItemsData, error: changeItemsError } = await supabase
    .from("change_items")
    .select("id,entity_type,entity_id,after_revision")
    .eq("organization_id", organizationId)
    .eq("change_request_id", changeRequestId);

  if (changeItemsError) {
    throw new Error(changeItemsError.message);
  }

  const changeItems = (changeItemsData ?? []) as ChangeItemRow[];
  const productIds = Array.from(
    new Set(
      changeItems
        .filter((item) => item.entity_type === "product")
        .map((item) => item.entity_id),
    ),
  );
  const partIds = Array.from(
    new Set(
      changeItems
        .filter((item) => item.entity_type === "part")
        .map((item) => item.entity_id),
    ),
  );
  const documentIds = Array.from(
    new Set(
      changeItems
        .filter((item) => item.entity_type === "document")
        .map((item) => item.entity_id),
    ),
  );
  const cadFileIds = Array.from(
    new Set(
      changeItems
        .filter((item) => item.entity_type === "cad_file")
        .map((item) => item.entity_id),
    ),
  );

  const [
    { data: productParents },
    { data: partParents },
    { data: documentParents },
    { data: cadFileParents },
    { data: linkedProductRevisions },
    { data: linkedPartRevisions },
    { data: linkedDocumentRevisions },
    { data: linkedCadFileRevisions },
  ] = await Promise.all([
    productIds.length
      ? supabase
          .from("products")
          .select("id,current_revision_id")
          .eq("organization_id", organizationId)
          .in("id", productIds)
      : Promise.resolve({ data: [] }),
    partIds.length
      ? supabase
          .from("parts")
          .select("id,current_revision_id")
          .eq("organization_id", organizationId)
          .in("id", partIds)
      : Promise.resolve({ data: [] }),
    documentIds.length
      ? supabase
          .from("documents")
          .select("id,current_revision_id")
          .eq("organization_id", organizationId)
          .in("id", documentIds)
      : Promise.resolve({ data: [] }),
    cadFileIds.length
      ? supabase
          .from("cad_files")
          .select("id,current_revision_id")
          .eq("organization_id", organizationId)
          .in("id", cadFileIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("product_revisions")
      .select("id,product_id,revision_code,status,created_at")
      .eq("organization_id", organizationId)
      .eq("change_request_id", changeRequestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("part_revisions")
      .select("id,part_id,revision_code,status,created_at")
      .eq("organization_id", organizationId)
      .eq("change_request_id", changeRequestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("document_revisions")
      .select("id,document_id,revision_code,status,created_at")
      .eq("organization_id", organizationId)
      .eq("change_request_id", changeRequestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("cad_file_revisions")
      .select("id,cad_file_id,revision_code,status,created_at")
      .eq("organization_id", organizationId)
      .eq("change_request_id", changeRequestId)
      .order("created_at", { ascending: false }),
  ]);

  const productParentRows = (productParents ?? []) as ParentRecord[];
  const partParentRows = (partParents ?? []) as ParentRecord[];
  const documentParentRows = (documentParents ?? []) as ParentRecord[];
  const cadFileParentRows = (cadFileParents ?? []) as ParentRecord[];

  const currentProductRevisionIds = productParentRows
    .map((row) => row.current_revision_id)
    .filter((value): value is string => Boolean(value));
  const currentPartRevisionIds = partParentRows
    .map((row) => row.current_revision_id)
    .filter((value): value is string => Boolean(value));
  const currentDocumentRevisionIds = documentParentRows
    .map((row) => row.current_revision_id)
    .filter((value): value is string => Boolean(value));
  const currentCadFileRevisionIds = cadFileParentRows
    .map((row) => row.current_revision_id)
    .filter((value): value is string => Boolean(value));

  const [
    { data: currentProductRevisions },
    { data: currentPartRevisions },
    { data: currentDocumentRevisions },
    { data: currentCadFileRevisions },
  ] = await Promise.all([
    currentProductRevisionIds.length
      ? supabase
          .from("product_revisions")
          .select("id,product_id,revision_code,status")
          .eq("organization_id", organizationId)
          .in("id", currentProductRevisionIds)
      : Promise.resolve({ data: [] }),
    currentPartRevisionIds.length
      ? supabase
          .from("part_revisions")
          .select("id,part_id,revision_code,status")
          .eq("organization_id", organizationId)
          .in("id", currentPartRevisionIds)
      : Promise.resolve({ data: [] }),
    currentDocumentRevisionIds.length
      ? supabase
          .from("document_revisions")
          .select("id,document_id,revision_code,status")
          .eq("organization_id", organizationId)
          .in("id", currentDocumentRevisionIds)
      : Promise.resolve({ data: [] }),
    currentCadFileRevisionIds.length
      ? supabase
          .from("cad_file_revisions")
          .select("id,cad_file_id,revision_code,status")
          .eq("organization_id", organizationId)
          .in("id", currentCadFileRevisionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const preferredProductRevisionByParent = new Map<
    string,
    RevisionRecord & { product_id: string }
  >();
  for (const revision of (linkedProductRevisions ?? []) as (RevisionRecord & {
    product_id: string;
  })[]) {
    if (!preferredProductRevisionByParent.has(revision.product_id)) {
      preferredProductRevisionByParent.set(revision.product_id, revision);
    }
  }

  const preferredPartRevisionByParent = new Map<
    string,
    RevisionRecord & { part_id: string }
  >();
  for (const revision of (linkedPartRevisions ?? []) as (RevisionRecord & {
    part_id: string;
  })[]) {
    if (!preferredPartRevisionByParent.has(revision.part_id)) {
      preferredPartRevisionByParent.set(revision.part_id, revision);
    }
  }

  const preferredDocumentRevisionByParent = new Map<
    string,
    RevisionRecord & { document_id: string }
  >();
  for (const revision of (linkedDocumentRevisions ?? []) as (RevisionRecord & {
    document_id: string;
  })[]) {
    if (!preferredDocumentRevisionByParent.has(revision.document_id)) {
      preferredDocumentRevisionByParent.set(revision.document_id, revision);
    }
  }

  const preferredCadFileRevisionByParent = new Map<
    string,
    RevisionRecord & { cad_file_id: string }
  >();
  for (const revision of (linkedCadFileRevisions ?? []) as (RevisionRecord & {
    cad_file_id: string;
  })[]) {
    if (!preferredCadFileRevisionByParent.has(revision.cad_file_id)) {
      preferredCadFileRevisionByParent.set(revision.cad_file_id, revision);
    }
  }

  const currentProductRevisionById = new Map(
    ((currentProductRevisions ?? []) as (RevisionRecord & { product_id: string })[]).map(
      (revision) => [revision.id, revision],
    ),
  );
  const currentPartRevisionById = new Map(
    ((currentPartRevisions ?? []) as (RevisionRecord & { part_id: string })[]).map((revision) => [
      revision.id,
      revision,
    ]),
  );
  const currentDocumentRevisionById = new Map(
    ((currentDocumentRevisions ?? []) as (RevisionRecord & { document_id: string })[]).map(
      (revision) => [revision.id, revision],
    ),
  );
  const currentCadFileRevisionById = new Map(
    ((currentCadFileRevisions ?? []) as (RevisionRecord & { cad_file_id: string })[]).map(
      (revision) => [revision.id, revision],
    ),
  );

  for (const product of productParentRows) {
    const revision =
      preferredProductRevisionByParent.get(product.id) ??
      (product.current_revision_id
        ? currentProductRevisionById.get(product.current_revision_id)
        : null);

    if (revision) {
      const { error: revisionError } = await supabase
        .from("product_revisions")
        .update({
          status: "released",
          released_at: now,
          released_by: userId,
        })
        .eq("organization_id", organizationId)
        .eq("id", revision.id);

      if (revisionError) {
        throw new Error(revisionError.message);
      }

      const { error: productError } = await supabase
        .from("products")
        .update({
          current_revision_id: revision.id,
          lifecycle_status: "released",
        })
        .eq("organization_id", organizationId)
        .eq("id", product.id);

      if (productError) {
        throw new Error(productError.message);
      }
    }
  }

  for (const part of partParentRows) {
    const revision =
      preferredPartRevisionByParent.get(part.id) ??
      (part.current_revision_id ? currentPartRevisionById.get(part.current_revision_id) : null);

    if (revision) {
      const { error: revisionError } = await supabase
        .from("part_revisions")
        .update({
          status: "released",
          released_at: now,
          released_by: userId,
        })
        .eq("organization_id", organizationId)
        .eq("id", revision.id);

      if (revisionError) {
        throw new Error(revisionError.message);
      }

      const { error: partError } = await supabase
        .from("parts")
        .update({
          current_revision_id: revision.id,
          lifecycle_status: "released",
        })
        .eq("organization_id", organizationId)
        .eq("id", part.id);

      if (partError) {
        throw new Error(partError.message);
      }
    }
  }

  for (const document of documentParentRows) {
    const revision =
      preferredDocumentRevisionByParent.get(document.id) ??
      (document.current_revision_id
        ? currentDocumentRevisionById.get(document.current_revision_id)
        : null);

    if (revision) {
      const { error: revisionError } = await supabase
        .from("document_revisions")
        .update({ status: "released" })
        .eq("organization_id", organizationId)
        .eq("id", revision.id);

      if (revisionError) {
        throw new Error(revisionError.message);
      }

      const { error: documentError } = await supabase
        .from("documents")
        .update({
          current_revision_id: revision.id,
          status: "released",
        })
        .eq("organization_id", organizationId)
        .eq("id", document.id);

      if (documentError) {
        throw new Error(documentError.message);
      }
    }
  }

  for (const cadFile of cadFileParentRows) {
    const revision =
      preferredCadFileRevisionByParent.get(cadFile.id) ??
      (cadFile.current_revision_id
        ? currentCadFileRevisionById.get(cadFile.current_revision_id)
        : null);

    if (revision) {
      const { error: revisionError } = await supabase
        .from("cad_file_revisions")
        .update({ status: "released" })
        .eq("organization_id", organizationId)
        .eq("id", revision.id);

      if (revisionError) {
        throw new Error(revisionError.message);
      }

      const { error: cadFileError } = await supabase
        .from("cad_files")
        .update({
          current_revision_id: revision.id,
          status: "released",
        })
        .eq("organization_id", organizationId)
        .eq("id", cadFile.id);

      if (cadFileError) {
        throw new Error(cadFileError.message);
      }
    }
  }

  const afterRevisionByItemId = new Map<string, string>();
  for (const item of changeItems) {
    if (item.entity_type === "product") {
      const revision =
        preferredProductRevisionByParent.get(item.entity_id) ??
        (productParentRows.find((row) => row.id === item.entity_id)?.current_revision_id
          ? currentProductRevisionById.get(
              productParentRows.find((row) => row.id === item.entity_id)?.current_revision_id ?? "",
            )
          : null);
      if (revision) {
        afterRevisionByItemId.set(item.id, revision.revision_code);
      }
    }

    if (item.entity_type === "part") {
      const revision =
        preferredPartRevisionByParent.get(item.entity_id) ??
        (partParentRows.find((row) => row.id === item.entity_id)?.current_revision_id
          ? currentPartRevisionById.get(
              partParentRows.find((row) => row.id === item.entity_id)?.current_revision_id ?? "",
            )
          : null);
      if (revision) {
        afterRevisionByItemId.set(item.id, revision.revision_code);
      }
    }

    if (item.entity_type === "document") {
      const revision =
        preferredDocumentRevisionByParent.get(item.entity_id) ??
        (documentParentRows.find((row) => row.id === item.entity_id)?.current_revision_id
          ? currentDocumentRevisionById.get(
              documentParentRows.find((row) => row.id === item.entity_id)?.current_revision_id ??
                "",
            )
          : null);
      if (revision) {
        afterRevisionByItemId.set(item.id, revision.revision_code);
      }
    }

    if (item.entity_type === "cad_file") {
      const revision =
        preferredCadFileRevisionByParent.get(item.entity_id) ??
        (cadFileParentRows.find((row) => row.id === item.entity_id)?.current_revision_id
          ? currentCadFileRevisionById.get(
              cadFileParentRows.find((row) => row.id === item.entity_id)?.current_revision_id ??
                "",
            )
          : null);
      if (revision) {
        afterRevisionByItemId.set(item.id, revision.revision_code);
      }
    }
  }

  for (const item of changeItems) {
    const afterRevision = afterRevisionByItemId.get(item.id);
    if (!afterRevision || item.after_revision === afterRevision) {
      continue;
    }

    const { error: itemUpdateError } = await supabase
      .from("change_items")
      .update({ after_revision: afterRevision })
      .eq("organization_id", organizationId)
      .eq("id", item.id);

    if (itemUpdateError) {
      throw new Error(itemUpdateError.message);
    }
  }

  const { error: releaseError } = await supabase
    .from("change_requests")
    .update({
      status: "released",
      released_at: now,
    })
    .eq("organization_id", organizationId)
    .eq("id", changeRequestId);

  if (releaseError) {
    throw new Error(releaseError.message);
  }

  revalidatePath("/changes");
  revalidatePath(`/changes/${changeRequestId}`);
  revalidatePath("/products");
  revalidatePath("/parts");
  revalidatePath("/documents");
  revalidatePath("/cad");

  for (const productId of productIds) {
    revalidatePath(`/products/${productId}`);
  }

  for (const partId of partIds) {
    revalidatePath(`/parts/${partId}`);
  }

  for (const documentId of documentIds) {
    revalidatePath(`/documents/${documentId}`);
  }

  for (const cadFileId of cadFileIds) {
    revalidatePath(`/cad/${cadFileId}`);
  }

  redirect(`/changes/${changeRequestId}`);
}
