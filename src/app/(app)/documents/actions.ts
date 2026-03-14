"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";
import { hasRoleAccess } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type UploadRevisionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type DocumentRecord = {
  id: string;
  organization_id: string;
};

const documentPageRoles = ["admin", "engineer", "approver", "supplier"] as const;

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

export async function uploadDocumentRevision(
  _previousState: UploadRevisionState,
  formData: FormData,
): Promise<UploadRevisionState> {
  const access = await getAuthenticatedAppContext();

  if (access.status !== "authorized") {
    return {
      status: "error",
      message: "You need an active session to upload a document revision.",
    };
  }

  if (!hasRoleAccess(access.user.role, documentPageRoles)) {
    return {
      status: "error",
      message: "Your role does not have access to upload revisions.",
    };
  }

  const documentId = formData.get("documentId");
  const fileEntry = formData.get("file");

  if (typeof documentId !== "string" || !documentId) {
    return { status: "error", message: "Missing document context for upload." };
  }

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { status: "error", message: "Choose a file before uploading." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "error", message: "Unable to resolve the signed-in user session." };
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,organization_id")
    .eq("id", documentId)
    .maybeSingle<DocumentRecord>();

  if (documentError || !document) {
    return { status: "error", message: "Document record could not be loaded for this upload." };
  }

  const { data: latestRevision, error: latestRevisionError } = await supabase
    .from("document_revisions")
    .select("revision_code")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ revision_code: string }>();

  if (latestRevisionError) {
    return {
      status: "error",
      message: "Could not evaluate the current revision state before upload.",
    };
  }

  const nextRevisionCode = getNextRevisionCode(latestRevision?.revision_code ?? null);
  const sanitizedFileName = sanitizeFileName(fileEntry.name || "document-file");
  const storagePath = `${document.organization_id}/${documentId}/${Date.now()}-${sanitizedFileName}`;
  const storageBucket = "documents";

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
    .from("document_revisions")
    .insert({
      organization_id: document.organization_id,
      document_id: documentId,
      revision_code: nextRevisionCode,
      file_name: fileEntry.name,
      storage_bucket: storageBucket,
      storage_path: storagePath,
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
      message: "Revision metadata could not be saved after file upload.",
    };
  }

  const { error: updateDocumentError } = await supabase
    .from("documents")
    .update({ current_revision_id: insertedRevision.id })
    .eq("id", documentId);

  if (updateDocumentError) {
    return {
      status: "error",
      message: "Revision uploaded but document pointer could not be updated.",
    };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);

  return {
    status: "success",
    message: `Revision ${insertedRevision.revision_code} uploaded successfully.`,
  };
}

export type { UploadRevisionState };
