import { NextResponse } from "next/server";

import { jsonCreated, jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type CadFileCreatePayload = {
  cad_number?: string;
  title?: string;
  cad_type?: string | null;
  owner_entity_type?: string;
  owner_entity_id?: string;
  status?: string;
};

const cadMutationRoles = ["admin", "engineer", "supplier"] as const;

export async function GET() {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cad_files")
    .select("id,cad_number,title,cad_type,owner_entity_type,owner_entity_id,status,current_revision_id,created_by,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiActor(cadMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  let payload: CadFileCreatePayload;
  try {
    payload = (await request.json()) as CadFileCreatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (
    !payload.cad_number?.trim() ||
    !payload.title?.trim() ||
    !payload.owner_entity_type?.trim() ||
    !payload.owner_entity_id?.trim()
  ) {
    return jsonError(
      "cad_number, title, owner_entity_type, and owner_entity_id are required",
      400,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cad_files")
    .insert({
      organization_id: auth.actor.organizationId,
      cad_number: payload.cad_number.trim(),
      title: payload.title.trim(),
      cad_type: payload.cad_type ?? null,
      owner_entity_type: payload.owner_entity_type.trim(),
      owner_entity_id: payload.owner_entity_id.trim(),
      status: payload.status?.trim() || "draft",
      created_by: auth.actor.userId,
    })
    .select("id,cad_number,title,cad_type,owner_entity_type,owner_entity_id,status,current_revision_id,created_by,created_at,updated_at")
    .single();

  if (error) {
    return jsonError(error.message, 400);
  }

  return jsonCreated({ data });
}
