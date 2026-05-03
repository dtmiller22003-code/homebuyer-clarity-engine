"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leadDocuments } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthContext } from "@/lib/supabase/auth";

export type DeleteLeadDocumentResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Permanently removes a lead document.
 *
 * Why only admins: deleting borrower files is destructive and irreversible. The
 * dashboard UI only exposes this action on admin-only routes, and this handler
 * rejects non-admin sessions so loan officers cannot delete via forged requests.
 * RLS on `lead_documents` also restricts DELETE to admins.
 *
 * Order: remove the Storage object first (when bucket/path are set), then delete
 * the `lead_documents` row. That way we do not delete DB metadata while the blob
 * still exists; if the blob is already missing, we still remove the row.
 */
export async function deleteLeadDocument(
  documentId: string,
): Promise<DeleteLeadDocumentResult> {
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
    return { ok: false, error: "Only administrators can delete files." };
  }

  const [row] = await db
    .select()
    .from(leadDocuments)
    .where(
      and(
        eq(leadDocuments.id, documentId),
        eq(leadDocuments.organizationId, auth.organizationId),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false, error: "File not found." };
  }

  const bucket = row.storageBucket?.trim();
  const path = row.storagePath?.trim();

  if (bucket && path) {
    // --- Supabase Storage: delete the binary object (bucket + path from DB row)
    const supabaseForStorage =
      createServiceRoleClient() ?? createClient();
    const { error: storageError } = await supabaseForStorage.storage
      .from(bucket)
      .remove([path]);

    if (storageError) {
      const msg = storageError.message?.toLowerCase() ?? "";
      const notFound =
        msg.includes("not found") ||
        msg.includes("no such") ||
        msg.includes("does not exist");
      if (!notFound) {
        return {
          ok: false,
          error: storageError.message || "Could not delete file from storage.",
        };
      }
      // Object already gone — still remove the DB record so metadata stays consistent.
    }
  }

  // --- Database: delete the metadata row tied to this file
  try {
    await db.delete(leadDocuments).where(eq(leadDocuments.id, documentId));
  } catch {
    return {
      ok: false,
      error:
        "Could not finish deleting the file record. If the problem persists, contact support.",
    };
  }

  revalidatePath("/settings/files");
  return { ok: true };
}
