import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { FilesPageClient, type LeadDocumentListItem } from "@/app/settings/files/FilesPageClient";
import { db } from "@/db/client";
import { leadDocuments, leads } from "@/db/schema";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function FilesSettingsPage() {
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
    redirect("/");
  }

  const rows = await db
    .select({
      id: leadDocuments.id,
      originalFilename: leadDocuments.originalFilename,
      createdAt: leadDocuments.createdAt,
      leadId: leadDocuments.leadId,
      firstName: leads.firstName,
      lastName: leads.lastName,
    })
    .from(leadDocuments)
    .innerJoin(leads, eq(leadDocuments.leadId, leads.id))
    .where(eq(leadDocuments.organizationId, auth.organizationId))
    .orderBy(desc(leadDocuments.createdAt));

  const documents: LeadDocumentListItem[] = rows.map((r) => ({
    id: r.id,
    originalFilename: r.originalFilename,
    createdAt: r.createdAt.toISOString(),
    leadId: r.leadId,
    leadName: `${r.firstName} ${r.lastName}`,
  }));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Files</h1>
        <p className="text-sm text-surface-600 mt-1">
          Documents uploaded for leads in your organization. Only administrators
          can delete stored files.
        </p>
      </div>

      <FilesPageClient documents={documents} />
    </div>
  );
}
