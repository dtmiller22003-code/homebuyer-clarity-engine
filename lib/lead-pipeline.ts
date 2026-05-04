import type { LeadPipelineStatus } from "@/lib/types";

export const LEAD_PIPELINE_STATUSES: readonly LeadPipelineStatus[] = [
  "new",
  "contacted",
  "prequalified",
  "preapproved",
  "under_contract",
  "closed",
  "dead",
];

const LEGACY_STATUS_MAP: Record<string, LeadPipelineStatus> = {
  reviewed: "contacted",
  approved: "preapproved",
  archived: "dead",
  sent_to_crm: "closed",
};

export function normalizeLeadPipelineStatus(raw: string): LeadPipelineStatus {
  const s = raw?.trim() ?? "";
  if ((LEAD_PIPELINE_STATUSES as readonly string[]).includes(s)) {
    return s as LeadPipelineStatus;
  }
  if (s in LEGACY_STATUS_MAP) return LEGACY_STATUS_MAP[s]!;
  return "new";
}

export const LEAD_PIPELINE_LABELS: Record<LeadPipelineStatus, string> = {
  new: "New",
  contacted: "Contacted",
  prequalified: "Prequalified",
  preapproved: "Preapproved",
  under_contract: "Under contract",
  closed: "Closed",
  dead: "Dead",
};

/** Tailwind utility bundles for pill badges */
export const LEAD_PIPELINE_BADGE_CLASS: Record<LeadPipelineStatus, string> = {
  new: "bg-surface-200 text-surface-800 border border-surface-300/80",
  contacted: "bg-blue-100 text-blue-900 border border-blue-200/80",
  prequalified: "bg-teal-100 text-teal-900 border border-teal-200/80",
  preapproved: "bg-violet-100 text-violet-900 border border-violet-200/80",
  under_contract: "bg-orange-100 text-orange-900 border border-orange-200/80",
  closed: "bg-emerald-100 text-emerald-900 border border-emerald-200/80",
  dead: "bg-red-100 text-red-900 border border-red-200/80",
};
