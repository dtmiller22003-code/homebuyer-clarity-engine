"use client";

import type { LeadPipelineStatus } from "@/lib/types";
import {
  LEAD_PIPELINE_BADGE_CLASS,
  LEAD_PIPELINE_LABELS,
  LEAD_PIPELINE_STATUSES,
} from "@/lib/lead-pipeline";

export function LeadPipelineBadge({ status }: { status: LeadPipelineStatus }) {
  const cls = LEAD_PIPELINE_BADGE_CLASS[status] ?? LEAD_PIPELINE_BADGE_CLASS.new;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {LEAD_PIPELINE_LABELS[status] ?? status}
    </span>
  );
}

interface LeadPipelineStatusSelectProps {
  leadId: string;
  value: LeadPipelineStatus;
  disabled?: boolean;
  onChange: (leadId: string, next: LeadPipelineStatus) => void;
  /** Compact = single row with label; default block for detail panel */
  variant?: "compact" | "block";
}

export function LeadPipelineStatusSelect({
  leadId,
  value,
  disabled,
  onChange,
  variant = "block",
}: LeadPipelineStatusSelectProps) {
  const select = (
    <select
      id={`pipeline-status-${leadId}`}
      value={value}
      disabled={disabled}
      onChange={(e) =>
        onChange(leadId, e.target.value as LeadPipelineStatus)
      }
      className="text-xs border border-surface-300 rounded-md px-2 py-1.5 bg-white text-surface-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand disabled:opacity-50 min-w-[11rem]"
      aria-label="Change lead status"
    >
      {LEAD_PIPELINE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {LEAD_PIPELINE_LABELS[s]}
        </option>
      ))}
    </select>
  );

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-wide text-surface-500 whitespace-nowrap">
          Change status
        </span>
        {select}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label
        htmlFor={`pipeline-status-${leadId}`}
        className="block text-[11px] font-medium text-surface-700"
      >
        Change status
      </label>
      {select}
    </div>
  );
}
