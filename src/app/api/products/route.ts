import { NextResponse } from "next/server";

import { jsonCreated, jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type ProductCreatePayload = {
  product_code?: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  lifecycle_status?: string;
  owner_user_id?: string | null;
};

const productMutationRoles = ["admin", "engineer", "approver"] as const;

export async function GET() {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,product_code,name,description,category,lifecycle_status,owner_user_id,current_revision_id,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiActor(productMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  let payload: ProductCreatePayload;
  try {
    payload = (await request.json()) as ProductCreatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!payload.product_code?.trim() || !payload.name?.trim()) {
    return jsonError("product_code and name are required", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: auth.actor.organizationId,
      product_code: payload.product_code.trim(),
      name: payload.name.trim(),
      description: payload.description ?? null,
      category: payload.category ?? null,
      lifecycle_status: payload.lifecycle_status?.trim() || "draft",
      owner_user_id: payload.owner_user_id ?? null,
    })
    .select("id,product_code,name,description,category,lifecycle_status,owner_user_id,current_revision_id,created_at,updated_at")
    .single();

  if (error) {
    return jsonError(error.message, 400);
  }

  return jsonCreated({ data });
}
