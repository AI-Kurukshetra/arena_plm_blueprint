"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type UploadCadRevisionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type CadFileRecord = {
  id: string;
  organization_id: string;
};

const cadPageRoles = ["admin", "engineer", "supplier"] as const;

function sanitizeFileName(name: string) {
  return name.replaceAll(/[^\w.-]/g, "_");
}

function getNextRevisionCode(currentCode: string | null) {
  if (!currentCode) {
    return "A";
  }

  const normalized = currentCode.trim().toUpperCase();
  const singleLetterPattern = /^[A-Z]$/;
  if (singleLetterPattern.test(normalized)) {
    if (normalized === "Z") {
      return "R1";
    }

    const code = normalized.charCodeAt(0) + 1;
    return String.fromCharCode(code);
  }

  const releasePattern = /^R(\d+)$/;
  const match = releasePattern.exec(normalized);
  if (match) {
    const next = Number(match[1]) + 1;
    return `R${next}`;
  }

  return "R1";
}

export async function uploadCadRevision(
  _previousState: UploadCadRevisionState,
  formData: FormData,
): Promise<UploadCadRevisionState> {
  const access = await getAuthenticatedAppContext();

  if (access.status !== "authorized") {
    return {
      status: "error",
      message: "You need an active session to upload a CAD revision.",
    };
  }

  if (!hasRoleAccess(access.user.role, cadPageRoles)) {
    return {
      status: "error",
      message: "Your role does not have access to upload CAD revisions.",
    };
  }

  const cadFileId = formData.get("cadFileId");
  const viewerUrlEntry = formData.get("viewerUrl");
  const fileEntry = formData.get("file");

  if (typeof cadFileId !== "string" || !cadFileId) {
    return { status: "error", message: "Missing CAD file context for upload." };
  }

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { status: "error", message: "Choose a CAD file before uploading." };
  }

  const viewerUrl =
    typeof viewerUrlEntry === "string" && viewerUrlEntry.trim().length > 0
      ? viewerUrlEntry.trim()
      : null;

  if (viewerUrl) {
    try {
      new URL(viewerUrl);
    } catch {
      return {
        status: "error",
        message: "Viewer URL must be a valid absolute URL.",
      };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "error", message: "Unable to resolve the signed-in user session." };
  }

  const { data: cadFile, error: cadFileError } = await supabase
    .from("cad_files")
    .select("id,organization_id")
    .eq("id", cadFileId)
    .maybeSingle<CadFileRecord>();

  if (cadFileError || !cadFile) {
    return { status: "error", message: "CAD record could not be loaded for this upload." };
  }

  const { data: latestRevision, error: latestRevisionError } = await supabase
    .from("cad_file_revisions")
    .select("revision_code")
    .eq("cad_file_id", cadFileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ revision_code: string }>();

  if (latestRevisionError) {
    return {
      status: "error",
      message: "Could not evaluate current CAD revision before upload.",
    };
  }

  const nextRevisionCode = getNextRevisionCode(latestRevision?.revision_code ?? null);
  const sanitizedFileName = sanitizeFileName(fileEntry.name || "cad-file");
  const storagePath = `${cadFile.organization_id}/${cadFileId}/${Date.now()}-${sanitizedFileName}`;
  const storageBucket = "cad-files";

  const { error: uploadError } = await supabase.storage
    .from(storageBucket)
    .upload(storagePath, fileEntry, {
      upsert: false,
      contentType: fileEntry.type || undefined,
    });

  if (uploadError) {
    return {
      status: "error",
      message: `File upload failed: ${uploadError.message}`,
    };
  }

  const { data: insertedRevision, error: insertError } = await supabase
    .from("cad_file_revisions")
    .insert({
      organization_id: cadFile.organization_id,
      cad_file_id: cadFileId,
      revision_code: nextRevisionCode,
      file_name: fileEntry.name,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      viewer_url: viewerUrl,
      mime_type: fileEntry.type || null,
      file_size_bytes: fileEntry.size,
      status: "draft",
      uploaded_by: user.id,
    })
    .select("id,revision_code")
    .maybeSingle<{ id: string; revision_code: string }>();

  if (insertError || !insertedRevision) {
    return {
      status: "error",
      message: "CAD revision metadata could not be saved after file upload.",
    };
  }

  const { error: updateCadFileError } = await supabase
    .from("cad_files")
    .update({ current_revision_id: insertedRevision.id })
    .eq("id", cadFileId);

  if (updateCadFileError) {
    return {
      status: "error",
      message: "CAD revision uploaded but current revision pointer could not be updated.",
    };
  }

  revalidatePath("/cad");
  revalidatePath(`/cad/${cadFileId}`);

  return {
    status: "success",
    message: `CAD revision ${insertedRevision.revision_code} uploaded successfully.`,
  };
}

export type { UploadCadRevisionState };
