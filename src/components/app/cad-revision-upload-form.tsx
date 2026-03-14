"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { uploadCadRevision, type UploadCadRevisionState } from "@/app/(app)/cad/actions";

const initialState: UploadCadRevisionState = {
  status: "idle",
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
      disabled={pending}
      type="submit"
    >
      {pending ? "Uploading..." : "Upload CAD Revision"}
    </button>
  );
}

export function CadRevisionUploadForm({
  cadFileId,
}: Readonly<{
  cadFileId: string;
}>) {
  const [state, formAction] = useActionState(uploadCadRevision, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input name="cadFileId" type="hidden" value={cadFileId} />

      <div>
        <label
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
          htmlFor="cad-viewer-url"
        >
          Viewer URL (optional)
        </label>
        <input
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
          id="cad-viewer-url"
          name="viewerUrl"
          placeholder="https://viewer.example.com/model/..."
          type="url"
        />
      </div>

      <div>
        <label
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
          htmlFor="cad-file-upload"
        >
          CAD file
        </label>
        <input
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          id="cad-file-upload"
          name="file"
          required
          type="file"
        />
      </div>

      <SubmitButton />

      {state.message ? (
        <p
          className={`text-sm ${
            state.status === "success" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
