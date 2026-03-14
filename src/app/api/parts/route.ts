import { NextResponse } from "next/server";

import { jsonCreated, jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type PartCreatePayload = {
  part_number?: string;
  name?: string;
  description?: string | null;
  part_type?: string | null;
  unit_of_measure?: string | null;
  lifecycle_status?: string;
  preferred_supplier_id?: string | null;
  owner_user_id?: string | null;
};

const partMutationRoles = ["admin", "engineer", "approver"] as const;

export async function GET() {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .select("id,part_number,name,description,part_type,unit_of_measure,lifecycle_status,preferred_supplier_id,current_revision_id,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiActor(partMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  let payload: PartCreatePayload;
  try {
    payload = (await request.json()) as PartCreatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!payload.part_number?.trim() || !payload.name?.trim()) {
    return jsonError("part_number and name are required", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .insert({
      organization_id: auth.actor.organizationId,
      part_number: payload.part_number.trim(),
      name: payload.name.trim(),
      description: payload.description ?? null,
      part_type: payload.part_type ?? null,
      unit_of_measure: payload.unit_of_measure ?? null,
      lifecycle_status: payload.lifecycle_status?.trim() || "draft",
      preferred_supplier_id: payload.preferred_supplier_id ?? null,
    })
    .select("id,part_number,name,description,part_type,unit_of_measure,lifecycle_status,preferred_supplier_id,current_revision_id,created_at,updated_at")
    .single();

  if (error) {
    return jsonError(error.message, 400);
  }

  return jsonCreated({ data });
}
