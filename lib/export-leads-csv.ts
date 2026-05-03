import type { Lead } from "@/lib/types";
import {
  LEAD_SOURCE_LABELS,
  READINESS_LABELS,
} from "@/lib/types";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Builds a UTF-8 CSV suitable for Excel (opens as spreadsheet). */
export function buildLeadsCsv(leads: Lead[]): string {
  const headers = [
    "id",
    "firstName",
    "lastName",
    "email",
    "phone",
    "status",
    "readiness",
    "loanPath",
    "leadSource",
    "assignedTo",
    "lastUpdated",
  ];
  const lines = [headers.join(",")];
  for (const l of leads) {
    const row = [
      l.id,
      l.firstName,
      l.lastName,
      l.email,
      l.phone,
      l.status,
      READINESS_LABELS[l.decision.readiness],
      l.decision.loanPath,
      LEAD_SOURCE_LABELS[l.leadSource],
      l.assignedTo,
      l.lastUpdated,
    ].map((v) => escapeCsvCell(String(v)));
    lines.push(row.join(","));
  }
  return "\uFEFF" + lines.join("\n");
}

export function downloadLeadsCsv(leads: Lead[], filename = "leads-export.csv") {
  const csv = buildLeadsCsv(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
