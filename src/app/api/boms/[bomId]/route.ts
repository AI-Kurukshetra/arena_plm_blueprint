import { NextResponse } from "next/server";

import { jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type BomUpdatePayload = {
  product_revision_id?: string;
  name?: string;
  status?: string;
  notes?: string | null;
};

const bomMutationRoles = ["admin", "engineer", "approver"] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ bomId: string }> },
) {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const { bomId } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boms")
    .select("id,product_revision_id,name,status,notes,created_by,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", bomId)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError("BOM not found", 404);
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bomId: string }> },
) {
  const auth = await requireApiActor(bomMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { bomId } = await context.params;

  let payload: BomUpdatePayload;
  try {
    payload = (await request.json()) as BomUpdatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const updates: Record<string, unknown> = {};

  if (typeof payload.product_revision_id === "string") {
    updates.product_revision_id = payload.product_revision_id.trim();
  }

  if (typeof payload.name === "string") {
    updates.name = payload.name.trim();
  }

  if (typeof payload.status === "string") {
    updates.status = payload.status.trim();
  }

  if (payload.notes !== undefined) {
    updates.notes = payload.notes;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields provided for update", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boms")
    .update(updates)
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", bomId)
    .select("id,product_revision_id,name,status,notes,created_by,created_at,updated_at")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("BOM not found", 404);
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ bomId: string }> },
) {
  const auth = await requireApiActor(bomMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { bomId } = await context.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boms")
    .delete()
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", bomId)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("BOM not found", 404);
  }

  return NextResponse.json({ success: true, id: data.id });
}
