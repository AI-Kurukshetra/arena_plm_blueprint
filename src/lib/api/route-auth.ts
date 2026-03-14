import { NextResponse } from "next/server";

import { appRoles, normalizeAppRole, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type ApiActor = {
  userId: string;
  organizationId: string;
  role: AppRole;
};

type ApiAuthResult =
  | { ok: true; actor: ApiActor }
  | { ok: false; response: NextResponse };

type UserProfileRow = {
  organization_id: string | null;
  role: string | null;
  is_active: boolean | null;
};

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonCreated(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export async function requireApiActor(allowedRoles?: readonly AppRole[]): Promise<ApiAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("organization_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  if (profileError || !profile) {
    return { ok: false, response: jsonError("User profile not found", 403) };
  }

  if (profile.is_active === false) {
    return { ok: false, response: jsonError("User profile is inactive", 403) };
  }

  const role = normalizeAppRole(profile.role);
  if (!role) {
    return { ok: false, response: jsonError("User role is invalid", 403) };
  }

  if (!profile.organization_id) {
    return { ok: false, response: jsonError("User organization is missing", 403) };
  }

  const permittedRoles = allowedRoles ?? appRoles;
  if (!permittedRoles.includes(role)) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return {
    ok: true,
    actor: {
      userId: user.id,
      organizationId: profile.organization_id,
      role,
    },
  };
}
