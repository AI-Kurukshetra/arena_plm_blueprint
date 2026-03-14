import { NextResponse } from "next/server";

import { jsonCreated, jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type BomCreatePayload = {
  product_revision_id?: string;
  name?: string;
  status?: string;
  notes?: string | null;
};

const bomMutationRoles = ["admin", "engineer", "approver"] as const;

export async function GET() {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boms")
    .select("id,product_revision_id,name,status,notes,created_by,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiActor(bomMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  let payload: BomCreatePayload;
  try {
    payload = (await request.json()) as BomCreatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!payload.product_revision_id?.trim() || !payload.name?.trim()) {
    return jsonError("product_revision_id and name are required", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boms")
    .insert({
      organization_id: auth.actor.organizationId,
      product_revision_id: payload.product_revision_id.trim(),
      name: payload.name.trim(),
      status: payload.status?.trim() || "draft",
      notes: payload.notes ?? null,
      created_by: auth.actor.userId,
    })
    .select("id,product_revision_id,name,status,notes,created_by,created_at,updated_at")
    .single();

  if (error) {
    return jsonError(error.message, 400);
  }

  return jsonCreated({ data });
}
