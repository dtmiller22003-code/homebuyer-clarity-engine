// =============================================================================
// Server actions for lead operations.
// These are the replacement for Phase 1's local setState handlers.
// =============================================================================

"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { leadEvents, leads } from "@/db/schema";
import {
  isAdminRole,
  isInternalStaffRole,
  isRealtorPartnerRole,
} from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";
import { evaluateLead } from "@/lib/decision-engine";
import { enrichLeadsWithIntakeSource } from "@/lib/enrich-lead-intake-source";
import { rowToLead } from "@/lib/row-mapper";
import type { Lead, LeadPipelineStatus } from "@/lib/types";
import {
  LEAD_PIPELINE_STATUSES,
  normalizeLeadPipelineStatus,
} from "@/lib/lead-pipeline";

// -----------------------------------------------------------------------------
// listLeads — used by the dashboard page (server component) to fetch leads
// for the current user's organization.
// -----------------------------------------------------------------------------
export async function listLeads(): Promise<Lead[]> {
  const auth = await getAuthContext();

  const orgScope = eq(leads.organizationId, auth.organizationId);
  const whereClause =
    isRealtorPartnerRole(auth.role) && auth.realtorPartnerId
      ? and(orgScope, eq(leads.realtorPartnerId, auth.realtorPartnerId))
      : orgScope;

  const rows = await db
    .select()
    .from(leads)
    .where(whereClause)
    .orderBy(leads.lastUpdated);

  if (isRealtorPartnerRole(auth.role)) {
    return rows.map(rowToLead);
  }

  return enrichLeadsWithIntakeSource(auth.organizationId, rows);
}

// -----------------------------------------------------------------------------
// updateLeadStatus — pipeline stage (new → closed / dead)
// -----------------------------------------------------------------------------
const pipelineStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z
    .string()
    .refine(
      (s): s is LeadPipelineStatus =>
        (LEAD_PIPELINE_STATUSES as readonly string[]).includes(s),
      "Invalid pipeline status",
    ),
});

export async function updateLeadStatus(input: {
  leadId: string;
  status: LeadPipelineStatus;
}) {
  const auth = await getAuthContext();
  if (!isInternalStaffRole(auth.role)) {
    return { ok: false as const, error: "Access denied" };
  }
  const parsed = pipelineStatusSchema.parse(input);

  const [before] = await db
    .select({ status: leads.status })
    .from(leads)
    .where(
      and(
        eq(leads.id, parsed.leadId),
        eq(leads.organizationId, auth.organizationId),
      ),
    )
    .limit(1);

  if (!before) {
    return { ok: false as const, error: "Lead not found or access denied" };
  }

  const previousStatus = before.status;

  const [updated] = await db
    .update(leads)
    .set({
      status: parsed.status,
      lastUpdated: new Date(),
    })
    .where(
      and(
        eq(leads.id, parsed.leadId),
        eq(leads.organizationId, auth.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return { ok: false as const, error: "Lead not found or access denied" };
  }

  await db.insert(leadEvents).values({
    leadId: parsed.leadId,
    actorUserId: auth.userId,
    actorName: auth.displayName,
    eventType: "pipeline_status",
    metadata: { previousStatus, newStatus: parsed.status },
  });

  revalidatePath("/");
  revalidatePath("/realtor");
  const [enriched] = await enrichLeadsWithIntakeSource(auth.organizationId, [
    updated,
  ]);
  return { ok: true as const, lead: enriched };
}

// -----------------------------------------------------------------------------
// deleteLead — admin only; cascades lead_events / lead_documents via FK.
// -----------------------------------------------------------------------------
export async function deleteLead(
  leadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) {
    return { ok: false, error: "Only administrators can delete leads." };
  }

  const uuid = z.string().uuid().safeParse(leadId);
  if (!uuid.success) {
    return { ok: false, error: "Invalid lead id." };
  }

  const removed = await db
    .delete(leads)
    .where(
      and(eq(leads.id, leadId), eq(leads.organizationId, auth.organizationId)),
    )
    .returning({ id: leads.id });

  if (removed.length === 0) {
    return { ok: false, error: "Lead not found or you do not have access." };
  }

  revalidatePath("/");
  revalidatePath("/realtor");
  revalidatePath("/settings/realtors");
  return { ok: true };
}

// -----------------------------------------------------------------------------
// bulkDeleteLeads — admin only; same org scope as deleteLead; FK cascades.
// -----------------------------------------------------------------------------
const MAX_BULK_DELETE = 100;

export async function bulkDeleteLeads(
  leadIds: string[],
): Promise<
  { ok: true; deletedCount: number } | { ok: false; error: string }
> {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) {
    return { ok: false, error: "Only administrators can delete leads." };
  }

  const unique = [...new Set(leadIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { ok: false, error: "No leads selected." };
  }

  if (unique.length > MAX_BULK_DELETE) {
    return {
      ok: false,
      error: "You can delete up to 100 leads at a time.",
    };
  }

  const uuidSchema = z.string().uuid();
  const validIds = unique.filter((id) => uuidSchema.safeParse(id).success);
  if (validIds.length !== unique.length) {
    return { ok: false, error: "Invalid lead id in selection." };
  }

  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.organizationId, auth.organizationId),
        inArray(leads.id, validIds),
      ),
    );

  if (existing.length !== validIds.length) {
    return {
      ok: false,
      error:
        "One or more selected leads were not found or are not in your organization.",
    };
  }

  const removed = await db
    .delete(leads)
    .where(
      and(
        eq(leads.organizationId, auth.organizationId),
        inArray(leads.id, validIds),
      ),
    )
    .returning({ id: leads.id });

  if (removed.length !== validIds.length) {
    return {
      ok: false,
      error: "Could not delete all selected leads. Refresh and try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/realtor");
  revalidatePath("/settings/realtors");
  return { ok: true, deletedCount: removed.length };
}

// -----------------------------------------------------------------------------
// updateLeadInputs — triggered when agent edits pillar inputs.
// Re-runs the decision engine and saves the new cached decision.
// -----------------------------------------------------------------------------
const leadInputsSchema = z.object({
  leadId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  creditRange: z.enum(["BELOW_580", "580_619", "620_679", "680_739", "740_PLUS"]),
  annualGrossIncome: z.enum([
    "UNDER_40K",
    "40K_60K",
    "60K_90K",
    "90K_150K",
    "150K_PLUS",
  ]),
  monthlyDebtPayments: z.number().int().min(0),
  cashAvailable: z.enum(["UNDER_5K", "5K_15K", "15K_30K", "30K_60K", "60K_PLUS"]),
  employmentType: z.enum([
    "W2",
    "SELF_EMPLOYED_FILED",
    "SELF_EMPLOYED_NOT_FILED",
    "MIXED",
    "RETIRED",
  ]),
  hasFiledTaxes: z.boolean().optional(),
  heavyWriteOffs: z.boolean().optional(),
  targetPurchasePrice: z.number().int().min(0).optional(),
  assignedTo: z.string().min(1),
  notes: z.string().optional(),
});

export async function updateLeadInputs(input: z.infer<typeof leadInputsSchema>) {
  const auth = await getAuthContext();
  if (!isInternalStaffRole(auth.role)) {
    return { ok: false as const, error: "Access denied" };
  }
  const parsed = leadInputsSchema.parse(input);

  // Fetch current row to confirm org access
  const [existing] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, parsed.leadId),
        eq(leads.organizationId, auth.organizationId),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false as const, error: "Lead not found or access denied" };
  }

  // Re-evaluate the decision with the new inputs
  const newDecision = evaluateLead({
    id: existing.id,
    createdAt: existing.createdAt.toISOString(),
    lastUpdated: new Date().toISOString(),
    createdBy: existing.createdBy,
    leadSource: existing.leadSource,
    status: normalizeLeadPipelineStatus(String(existing.status)),
    ...parsed,
  });

  const [updated] = await db
    .update(leads)
    .set({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
      creditRange: parsed.creditRange,
      annualGrossIncome: parsed.annualGrossIncome,
      monthlyDebtPayments: parsed.monthlyDebtPayments,
      cashAvailable: parsed.cashAvailable,
      employmentType: parsed.employmentType,
      hasFiledTaxes:
        parsed.hasFiledTaxes === undefined
          ? null
          : parsed.hasFiledTaxes
            ? "true"
            : "false",
      heavyWriteOffs:
        parsed.heavyWriteOffs === undefined
          ? null
          : parsed.heavyWriteOffs
            ? "true"
            : "false",
      targetPurchasePrice: parsed.targetPurchasePrice ?? null,
      assignedTo: parsed.assignedTo,
      notes: parsed.notes ?? null,
      decision: newDecision,
      lastUpdated: new Date(),
    })
    .where(eq(leads.id, parsed.leadId))
    .returning();

  await db.insert(leadEvents).values({
    leadId: parsed.leadId,
    actorUserId: auth.userId,
    actorName: auth.displayName,
    eventType: "inputs_updated",
    metadata: {
      previousReadiness: existing.decision.readiness,
      newReadiness: newDecision.readiness,
    },
  });

  revalidatePath("/");
  const [enriched] = await enrichLeadsWithIntakeSource(auth.organizationId, [
    updated,
  ]);
  return { ok: true as const, lead: enriched };
}

// -----------------------------------------------------------------------------
// listTeamMembers — for the assignee dropdown
// -----------------------------------------------------------------------------
export async function listTeamMembers() {
  const auth = await getAuthContext();

  const members = await db.query.teamMembers.findMany({
    where: (tm, { eq }) => eq(tm.organizationId, auth.organizationId),
    orderBy: (tm) => tm.displayName,
  });

  return members.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    email: m.email,
  }));
}
