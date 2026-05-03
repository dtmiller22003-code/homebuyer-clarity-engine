"use client";

/**
 * Delete controls are only rendered on `/settings/files`, which is server-gated
 * to admins. Loan officers never receive this UI; the server action rejects
 * non-admins as well.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteLeadDocument } from "@/app/actions/lead-documents";

export type LeadDocumentListItem = {
  id: string;
  originalFilename: string;
  createdAt: string;
  leadId: string;
  leadName: string;
};

interface FilesPageClientProps {
  documents: LeadDocumentListItem[];
}

const CONFIRM_MESSAGE =
  "Are you sure you want to delete this file? This cannot be undone.";

export function FilesPageClient({ documents }: FilesPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(documents);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleDelete = (doc: LeadDocumentListItem) => {
    if (!window.confirm(CONFIRM_MESSAGE)) return;

    startTransition(async () => {
      const result = await deleteLeadDocument(doc.id);
      if (result.ok) {
        setItems((prev) => prev.filter((d) => d.id !== doc.id));
        showToast("success", "File deleted successfully.");
        router.refresh();
      } else {
        showToast("error", result.error);
      }
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-surface-600 border border-dashed border-surface-200 rounded-lg p-8 text-center">
        No uploaded documents yet. When files are attached to leads, they will
        appear here for administrators to manage.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-surface-900 truncate">
                {doc.originalFilename}
              </div>
              <div className="text-xs text-surface-500 mt-0.5">
                Lead: {doc.leadName} ·{" "}
                {new Date(doc.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(doc)}
              disabled={isPending}
              className="shrink-0 text-sm font-medium text-red-700 hover:text-red-800 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 text-sm px-4 py-2.5 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-surface-900 text-white"
              : "bg-red-700 text-white"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
