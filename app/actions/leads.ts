// =============================================================================
// Server actions for lead operations.
// =============================================================================

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { leadEvents, leads } from "@/db/schema";
import { getAuthContext } from "@/lib/supabase/auth";
import { evaluateLead } from "@/lib/decision-engine";
import { rowToLead } from "@/lib/row-mapper";
import type { Lead, LeadStatus } from "@/lib/types";

// -----------------------------------------------------------------------------
// listLeads — used by the dashboard page (server component) to fetch leads
// for the current user's organization.
// -----------------------------------------------------------------------------
export async function listLeads(): Promise<Lead[]> {
  const auth = await getAuthContext();

  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.organizationId, auth.organizationId))
    .orderBy(leads.lastUpdated);

  return rows.map(rowToLead);
}

// -----------------------------------------------------------------------------
// updateLeadStatus — approve / archive / send_to_crm
// -----------------------------------------------------------------------------
const statusUpdateSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "reviewed", "approved", "archived", "sent_to_crm"]),
});

export async function updateLeadStatus(input: {
  leadId: string;
  status: LeadStatus;
}) {
  const auth = await getAuthContext();
  const parsed = statusUpdateSchema.parse(input);

  const [existing] = await db
    .select({ id: leads.id, status: leads.status })
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

  const previousStatus = existing.status;

  // Update only if the lead belongs to the same org
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

  // Record event
  await db.insert(leadEvents).values({
    leadId: parsed.leadId,
    actorUserId: auth.userId,
    actorName: auth.displayName,
    eventType: `status_${parsed.status}`,
    metadata: { previousStatus },
  });

  revalidatePath("/");
  return { ok: true as const, lead: rowToLead(updated) };
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
    status: existing.status,
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
  return { ok: true as const, lead: rowToLead(updated) };
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
