// =============================================================================
// Resolves intake attribution to a single human-readable line for staff UIs.
// Server-only (uses DB). Example: "Source: Realtor – Desmond Miller"
// =============================================================================

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import type { LeadRow } from "@/db/schema";
import { organizations, realtorPartners, teamMembers } from "@/db/schema";
import { rowToLead } from "@/lib/row-mapper";
import type { Lead, LeadAttributionSource } from "@/lib/types";

function formatIntakeSourceLine(
  row: LeadRow,
  companyName: string,
  realtorNames: Map<string, string>,
  loNames: Map<string, string>,
): string {
  const st = (row.sourceType ?? "company") as LeadAttributionSource;
  if (st === "company") {
    return `Source: Company – ${companyName}`;
  }
  if (st === "realtor") {
    const fromPartner = row.realtorPartnerId
      ? realtorNames.get(row.realtorPartnerId)
      : undefined;
    const snap = row.sourceDisplayName?.trim() || null;
    const display =
      fromPartner ?? snap ?? row.sourceSlug ?? "Unknown realtor";
    return `Source: Realtor – ${display}`;
  }
  const fromMember = row.sourceTeamMemberId
    ? loNames.get(row.sourceTeamMemberId)
    : undefined;
  const loSnap = row.sourceDisplayName?.trim() || null;
  const display =
    fromMember ?? loSnap ?? row.sourceSlug ?? row.assignedTo ?? "Unknown loan officer";
  return `Source: Loan Officer – ${display}`;
}

export async function enrichLeadsWithIntakeSource(
  organizationId: string,
  rows: LeadRow[],
): Promise<Lead[]> {
  const base = rows.map(rowToLead);
  if (rows.length === 0) return base;

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  const companyName = org?.name?.trim() || "Company";

  const realtorIds = [
    ...new Set(
      rows.map((r) => r.realtorPartnerId).filter((id): id is string => !!id),
    ),
  ];
  const realtorNames = new Map<string, string>();
  if (realtorIds.length > 0) {
    const rp = await db
      .select({
        id: realtorPartners.id,
        displayName: realtorPartners.displayName,
      })
      .from(realtorPartners)
      .where(
        and(
          eq(realtorPartners.organizationId, organizationId),
          inArray(realtorPartners.id, realtorIds),
        ),
      );
    for (const r of rp) realtorNames.set(r.id, r.displayName);
  }

  const loIds = [
    ...new Set(
      rows
        .map((r) => r.sourceTeamMemberId)
        .filter((id): id is string => !!id),
    ),
  ];
  const loNames = new Map<string, string>();
  if (loIds.length > 0) {
    const tm = await db
      .select({
        id: teamMembers.id,
        displayName: teamMembers.displayName,
      })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organizationId, organizationId),
          inArray(teamMembers.id, loIds),
        ),
      );
    for (const t of tm) loNames.set(t.id, t.displayName);
  }

  return base.map((lead, i) => ({
    ...lead,
    intakeSourceLine: formatIntakeSourceLine(
      rows[i],
      companyName,
      realtorNames,
      loNames,
    ),
  }));
}
