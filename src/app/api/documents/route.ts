import { NextResponse } from "next/server";

import { jsonCreated, jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type DocumentCreatePayload = {
  document_number?: string;
  title?: string;
  document_type?: string;
  owner_entity_type?: string;
  owner_entity_id?: string;
  status?: string;
};

const documentMutationRoles = ["admin", "engineer", "approver", "supplier"] as const;

export async function GET() {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id,document_number,title,document_type,owner_entity_type,owner_entity_id,status,current_revision_id,created_by,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiActor(documentMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  let payload: DocumentCreatePayload;
  try {
    payload = (await request.json()) as DocumentCreatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (
    !payload.document_number?.trim() ||
    !payload.title?.trim() ||
    !payload.document_type?.trim() ||
    !payload.owner_entity_type?.trim() ||
    !payload.owner_entity_id?.trim()
  ) {
    return jsonError(
      "document_number, title, document_type, owner_entity_type, and owner_entity_id are required",
      400,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: auth.actor.organizationId,
      document_number: payload.document_number.trim(),
      title: payload.title.trim(),
      document_type: payload.document_type.trim(),
      owner_entity_type: payload.owner_entity_type.trim(),
      owner_entity_id: payload.owner_entity_id.trim(),
      status: payload.status?.trim() || "draft",
      created_by: auth.actor.userId,
    })
    .select("id,document_number,title,document_type,owner_entity_type,owner_entity_id,status,current_revision_id,created_by,created_at,updated_at")
    .single();

  if (error) {
    return jsonError(error.message, 400);
  }

  return jsonCreated({ data });
}
