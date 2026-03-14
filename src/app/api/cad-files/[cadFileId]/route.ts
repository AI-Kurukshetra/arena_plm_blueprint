import { NextResponse } from "next/server";

import { jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type CadFileUpdatePayload = {
  cad_number?: string;
  title?: string;
  cad_type?: string | null;
  owner_entity_type?: string;
  owner_entity_id?: string;
  status?: string;
  current_revision_id?: string | null;
};

const cadMutationRoles = ["admin", "engineer", "supplier"] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ cadFileId: string }> },
) {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const { cadFileId } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cad_files")
    .select("id,cad_number,title,cad_type,owner_entity_type,owner_entity_id,status,current_revision_id,created_by,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", cadFileId)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError("CAD file not found", 404);
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ cadFileId: string }> },
) {
  const auth = await requireApiActor(cadMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { cadFileId } = await context.params;

  let payload: CadFileUpdatePayload;
  try {
    payload = (await request.json()) as CadFileUpdatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const updates: Record<string, unknown> = {};

  if (typeof payload.cad_number === "string") {
    updates.cad_number = payload.cad_number.trim();
  }

  if (typeof payload.title === "string") {
    updates.title = payload.title.trim();
  }

  if (payload.cad_type !== undefined) {
    updates.cad_type = payload.cad_type;
  }

  if (typeof payload.owner_entity_type === "string") {
    updates.owner_entity_type = payload.owner_entity_type.trim();
  }

  if (typeof payload.owner_entity_id === "string") {
    updates.owner_entity_id = payload.owner_entity_id.trim();
  }

  if (typeof payload.status === "string") {
    updates.status = payload.status.trim();
  }

  if (payload.current_revision_id !== undefined) {
    updates.current_revision_id = payload.current_revision_id;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields provided for update", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cad_files")
    .update(updates)
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", cadFileId)
    .select("id,cad_number,title,cad_type,owner_entity_type,owner_entity_id,status,current_revision_id,created_by,created_at,updated_at")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("CAD file not found", 404);
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ cadFileId: string }> },
) {
  const auth = await requireApiActor(cadMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { cadFileId } = await context.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cad_files")
    .delete()
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", cadFileId)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("CAD file not found", 404);
  }

  return NextResponse.json({ success: true, id: data.id });
}
