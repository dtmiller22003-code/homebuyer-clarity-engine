// =============================================================================
// Row mappers — translate between DB rows (Drizzle) and our Lead domain type.
// Keeps the decision engine completely unaware of the DB.
// =============================================================================

import type { Lead, LeadAttributionSource, LeadInputs } from "./types";
import type { LeadRow, NewLeadRow } from "@/db/schema";
import { evaluateLead } from "./decision-engine";

// DB → Domain
export function rowToLead(row: LeadRow): Lead {
  const inputs: LeadInputs = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    lastUpdated: row.lastUpdated.toISOString(),
    createdBy: row.createdBy,
    assignedTo: row.assignedTo,
    leadSource: row.leadSource,
    creditRange: row.creditRange,
    annualGrossIncome: row.annualGrossIncome,
    monthlyDebtPayments: row.monthlyDebtPayments,
    cashAvailable: row.cashAvailable,
    employmentType: row.employmentType,
    occupancyIntent: row.occupancyIntent,
    hasFiledTaxes:
      row.hasFiledTaxes === null ? undefined : row.hasFiledTaxes === "true",
    heavyWriteOffs:
      row.heavyWriteOffs === null ? undefined : row.heavyWriteOffs === "true",
    targetPurchasePrice: row.targetPurchasePrice ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    realtorPartnerId: row.realtorPartnerId ?? null,
    sourceType: (row.sourceType as LeadAttributionSource | undefined) ?? "company",
    sourceSlug: row.sourceSlug ?? null,
    sourceTeamMemberId: row.sourceTeamMemberId ?? null,
  };

  return { ...inputs, decision: row.decision };
}

// Domain Inputs → DB insert row. Computes the decision and caches it.
export function leadInputsToRow(
  inputs: Omit<LeadInputs, "id" | "createdAt" | "lastUpdated">,
  organizationId: string,
): Omit<NewLeadRow, "id" | "createdAt" | "lastUpdated"> {
  // Generate a temporary inputs object so the engine can evaluate it.
  // ID and dates don't affect the decision, so we use placeholders.
  const inputsForEval: LeadInputs = {
    ...inputs,
    id: "pending",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  const decision = evaluateLead(inputsForEval);

  return {
    organizationId,
    firstName: inputs.firstName,
    lastName: inputs.lastName,
    email: inputs.email,
    phone: inputs.phone,
    assignedTo: inputs.assignedTo,
    createdBy: inputs.createdBy,
    leadSource: inputs.leadSource,
    creditRange: inputs.creditRange,
    annualGrossIncome: inputs.annualGrossIncome,
    monthlyDebtPayments: inputs.monthlyDebtPayments,
    cashAvailable: inputs.cashAvailable,
    employmentType: inputs.employmentType,
    occupancyIntent: inputs.occupancyIntent ?? "PRIMARY_HOME",
    hasFiledTaxes:
      inputs.hasFiledTaxes === undefined
        ? null
        : inputs.hasFiledTaxes
          ? "true"
          : "false",
    heavyWriteOffs:
      inputs.heavyWriteOffs === undefined
        ? null
        : inputs.heavyWriteOffs
          ? "true"
          : "false",
    targetPurchasePrice: inputs.targetPurchasePrice ?? null,
    notes: inputs.notes ?? null,
    status: inputs.status,
    decision,
  };
}
