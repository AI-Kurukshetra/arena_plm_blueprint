import { NextResponse } from "next/server";

import { jsonError, requireApiActor } from "@/lib/api/route-auth";
import { createClient } from "@/lib/supabase/server";

type ProductUpdatePayload = {
  product_code?: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  lifecycle_status?: string;
  owner_user_id?: string | null;
  current_revision_id?: string | null;
};

const productMutationRoles = ["admin", "engineer", "approver"] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const auth = await requireApiActor();
  if (!auth.ok) {
    return auth.response;
  }

  const { productId } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,product_code,name,description,category,lifecycle_status,owner_user_id,current_revision_id,created_at,updated_at")
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError("Product not found", 404);
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const auth = await requireApiActor(productMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { productId } = await context.params;

  let payload: ProductUpdatePayload;
  try {
    payload = (await request.json()) as ProductUpdatePayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const updates: Record<string, unknown> = {};

  if (typeof payload.product_code === "string") {
    updates.product_code = payload.product_code.trim();
  }

  if (typeof payload.name === "string") {
    updates.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    updates.description = payload.description;
  }

  if (payload.category !== undefined) {
    updates.category = payload.category;
  }

  if (typeof payload.lifecycle_status === "string") {
    updates.lifecycle_status = payload.lifecycle_status.trim();
  }

  if (payload.owner_user_id !== undefined) {
    updates.owner_user_id = payload.owner_user_id;
  }

  if (payload.current_revision_id !== undefined) {
    updates.current_revision_id = payload.current_revision_id;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields provided for update", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", productId)
    .select("id,product_code,name,description,category,lifecycle_status,owner_user_id,current_revision_id,created_at,updated_at")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("Product not found", 404);
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const auth = await requireApiActor(productMutationRoles);
  if (!auth.ok) {
    return auth.response;
  }

  const { productId } = await context.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("organization_id", auth.actor.organizationId)
    .eq("id", productId)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (!data) {
    return jsonError("Product not found", 404);
  }

  return NextResponse.json({ success: true, id: data.id });
}
