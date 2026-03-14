import { NextResponse } from "next/server";

import { jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type PartUpdatePayload = {
  part_number?: string;
  name?: string;
  description?: string | null;
  part_type?: string | null;
  unit_of_measure?: string | null;
  lifecycle_status?: string;
  preferred_supplier_id?: string | null;
  current_revision_id?: string | null;
};

const partMutationRoles = ["admin", "engineer", "approver"] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ partId: string }> },
) {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const { partId } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .select("id,part_number,name,description,part_type,unit_of_measure,lifecycle_status,preferred_supplier_id,current_revision_id,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", partId)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError("Part not found", 404);
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ partId: string }> },
) {
  const auth = await requireApiActor(partMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { partId } = await context.params;

  let payload: PartUpdatePayload;
  try {
    payload = (await request.json()) as PartUpdatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const updates: Record<string, unknown> = {};

  if (typeof payload.part_number === "string") {
    updates.part_number = payload.part_number.trim();
  }

  if (typeof payload.name === "string") {
    updates.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    updates.description = payload.description;
  }

  if (payload.part_type !== undefined) {
    updates.part_type = payload.part_type;
  }

  if (payload.unit_of_measure !== undefined) {
    updates.unit_of_measure = payload.unit_of_measure;
  }

  if (typeof payload.lifecycle_status === "string") {
    updates.lifecycle_status = payload.lifecycle_status.trim();
  }

  if (payload.preferred_supplier_id !== undefined) {
    updates.preferred_supplier_id = payload.preferred_supplier_id;
  }

  if (payload.current_revision_id !== undefined) {
    updates.current_revision_id = payload.current_revision_id;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields provided for update", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .update(updates)
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", partId)
    .select("id,part_number,name,description,part_type,unit_of_measure,lifecycle_status,preferred_supplier_id,current_revision_id,created_at,updated_at")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("Part not found", 404);
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ partId: string }> },
) {
  const auth = await requireApiActor(partMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { partId } = await context.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .delete()
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", partId)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("Part not found", 404);
  }

  return NextResponse.json({ success: true, id: data.id });
}
