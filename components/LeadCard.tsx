import type { Lead } from "@/lib/types";
import {
  CASH_RANGE_LABELS,
  CREDIT_RANGE_LABELS,
  EMPLOYMENT_LABELS,
  INCOME_RANGE_LABELS,
  LOAN_PATH_LABELS,
  READINESS_LABELS,
} from "@/lib/types";
import { Badge } from "./Badge";
import { PillarScore } from "./PillarScore";

interface LeadCardProps {
  lead: Lead;
  selected: boolean;
  onClick: () => void;
}

const readinessVariant = {
  READY_NOW: "strong" as const,
  NEARLY_READY: "moderate" as const,
  NOT_READY_YET: "weak" as const,
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffHours = Math.floor((now - then) / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const days = Math.floor(diffHours / 24);
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function LeadCard({ lead, selected, onClick }: LeadCardProps) {
  const { decision } = lead;
  const fullName = `${lead.firstName} ${lead.lastName}`;
  const initials = `${lead.firstName[0]}${lead.lastName[0]}`;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white border rounded-md p-4 transition-all hover:shadow-sm ${
        selected
          ? "border-brand ring-2 ring-brand/20"
          : "border-surface-200 hover:border-surface-300"
      }`}
    >
      {/* Header: name, readiness, loan path */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-xs font-semibold text-surface-700 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-surface-900 truncate">
              {fullName}
            </div>
            <div className="text-xs text-surface-500 truncate">
              {lead.email} · {formatRelativeTime(lead.lastUpdated)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={readinessVariant[decision.readiness]}>
            {READINESS_LABELS[decision.readiness]}
          </Badge>
          {decision.loanPath !== "UNDETERMINED" && (
            <Badge
              variant={decision.loanPath === "QM" ? "qm" : "nonqm"}
              size="sm"
            >
              {LOAN_PATH_LABELS[decision.loanPath]}
            </Badge>
          )}
        </div>
      </div>

      {/* Inputs grid */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
        <InputField label="Credit" value={CREDIT_RANGE_LABELS[lead.creditRange]} />
        <InputField
          label="Income"
          value={INCOME_RANGE_LABELS[lead.annualGrossIncome]}
        />
        <InputField
          label="Cash"
          value={CASH_RANGE_LABELS[lead.cashAvailable]}
        />
        <InputField
          label="Employment"
          value={shortEmployment(lead.employmentType)}
        />
      </div>

      {/* Pillars */}
      <div className="flex gap-4 pt-3 border-t border-surface-100">
        <PillarScore label="Credit" score={decision.credit.score} compact />
        <PillarScore label="Income" score={decision.income.score} compact />
        <PillarScore label="Cash" score={decision.cash.score} compact />
        <div className="ml-auto text-xs text-surface-500">
          {decision.strongPillarCount}/3 strong
        </div>
      </div>
    </button>
  );
}

function InputField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-surface-500">
        {label}
      </div>
      <div className="text-sm text-surface-800 font-medium truncate">
        {value}
      </div>
    </div>
  );
}

function shortEmployment(type: keyof typeof EMPLOYMENT_LABELS): string {
  switch (type) {
    case "W2":
      return "W-2";
    case "SELF_EMPLOYED_FILED":
      return "SE (Filed)";
    case "SELF_EMPLOYED_NOT_FILED":
      return "SE (Unfiled)";
    case "MIXED":
      return "Mixed";
    case "RETIRED":
      return "Retired";
  }
}
