import type { Lead, PillarAnalysis, Recommendation } from "@/lib/types";
import {
  CASH_RANGE_LABELS,
  CREDIT_RANGE_LABELS,
  EMPLOYMENT_LABELS,
  INCOME_RANGE_LABELS,
  LEAD_SOURCE_LABELS,
  LOAN_PATH_LABELS,
  READINESS_LABELS,
} from "@/lib/types";
import { Badge } from "./Badge";
import { PillarScore } from "./PillarScore";

interface DetailPanelProps {
  lead: Lead | null;
}

const readinessVariant = {
  READY_NOW: "strong" as const,
  NEARLY_READY: "moderate" as const,
  NOT_READY_YET: "weak" as const,
};

export function DetailPanel({ lead }: DetailPanelProps) {
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white text-center p-8">
        <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-surface-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-surface-700">
          Select a lead to view details
        </p>
        <p className="text-xs text-surface-500 mt-1">
          Full breakdown and decision analysis will appear here
        </p>
      </div>
    );
  }

  const { decision } = lead;
  const fullName = `${lead.firstName} ${lead.lastName}`;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                {fullName}
              </h2>
              <div className="text-xs text-surface-500 mt-0.5">
                {lead.email} · {lead.phone}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={readinessVariant[decision.readiness]}>
                {READINESS_LABELS[decision.readiness]}
              </Badge>
              {decision.loanPath !== "UNDETERMINED" && (
                <Badge variant={decision.loanPath === "QM" ? "qm" : "nonqm"}>
                  {LOAN_PATH_LABELS[decision.loanPath]} Path
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-3">
            <MetaRow
              label="Assigned to"
              value={lead.assignedTo}
            />
            <MetaRow
              label="Source"
              value={LEAD_SOURCE_LABELS[lead.leadSource]}
            />
            <MetaRow
              label="Intake source"
              value={
                lead.intakeSourceLine ??
                (() => {
                  const st = lead.sourceType ?? "company";
                  if (st === "company") {
                    return "Source: Company";
                  }
                  if (st === "realtor") {
                    const tail =
                      lead.sourceDisplayName?.trim() ||
                      lead.sourceSlug ||
                      "Unknown realtor";
                    return `Source: Realtor – ${tail}`;
                  }
                  const tail =
                    lead.sourceDisplayName?.trim() ||
                    lead.sourceSlug ||
                    lead.assignedTo ||
                    "Unknown loan officer";
                  return `Source: Loan Officer – ${tail}`;
                })()
              }
            />
            <MetaRow
              label="Employment"
              value={EMPLOYMENT_LABELS[lead.employmentType]}
            />
            <MetaRow
              label="Target price"
              value={
                lead.targetPurchasePrice
                  ? `$${lead.targetPurchasePrice.toLocaleString()}`
                  : "—"
              }
            />
          </div>
        </div>

        {/* Decision Summary */}
        <Section title="Decision Summary">
          <div className="bg-surface-50 border border-surface-200 rounded-md p-3">
            <p className="text-sm text-surface-800 leading-relaxed">
              {decision.explanation}
            </p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-200 text-xs text-surface-600">
              <span className="font-medium">
                {decision.strongPillarCount}/3 pillars strong
              </span>
              {decision.weakestPillars.length > 0 && (
                <>
                  <span className="text-surface-300">·</span>
                  <span>
                    Weakest: {decision.weakestPillars.join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>
        </Section>

        {/* Pillar breakdown */}
        <Section title="Pillar Analysis">
          <div className="space-y-3">
            <PillarDetail
              label="Credit"
              rawValue={CREDIT_RANGE_LABELS[lead.creditRange]}
              analysis={decision.credit}
            />
            <PillarDetail
              label="Income vs Debt"
              rawValue={`${INCOME_RANGE_LABELS[lead.annualGrossIncome]} · $${lead.monthlyDebtPayments}/mo debt`}
              analysis={decision.income}
            />
            <PillarDetail
              label="Cash to Close"
              rawValue={CASH_RANGE_LABELS[lead.cashAvailable]}
              analysis={decision.cash}
            />
          </div>
        </Section>

        {/* Compensating factors */}
        {decision.compensatingFactors.length > 0 && (
          <Section title="Compensating Factors">
            <ul className="space-y-1.5">
              {decision.compensatingFactors.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-surface-700"
                >
                  <span className="text-green-600 mt-0.5">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Recommendations */}
        {decision.recommendations.length > 0 && (
          <Section title="Recommended Next Steps">
            <div className="space-y-2">
              {decision.recommendations.map((r) => (
                <RecommendationCard key={r.id} rec={r} />
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {lead.notes && (
          <Section title="Notes">
            <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 text-sm text-surface-700">
              {lead.notes}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Subcomponents
// =============================================================================
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4 border-b border-surface-100">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-surface-500">{label}</span>
      <span className="text-surface-800 font-medium truncate text-right">
        {value}
      </span>
    </div>
  );
}

function PillarDetail({
  label,
  rawValue,
  analysis,
}: {
  label: string;
  rawValue: string;
  analysis: PillarAnalysis;
}) {
  return (
    <div>
      <PillarScore
        label={label}
        score={analysis.score}
        headline={analysis.headline}
      />
      <div className="mt-2 px-1">
        <p className="text-xs text-surface-500 mb-1.5">Input: {rawValue}</p>
        <p className="text-sm text-surface-700 leading-relaxed mb-2">
          {analysis.detail}
        </p>
        {analysis.factors.length > 0 && (
          <ul className="space-y-1 mt-2">
            {analysis.factors.map((f, i) => (
              <li
                key={i}
                className="text-xs text-surface-600 flex items-start gap-1.5"
              >
                <span className="text-surface-400 mt-0.5">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const impactColor =
    rec.impact === "high"
      ? "bg-red-100 text-red-800"
      : rec.impact === "medium"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-surface-100 text-surface-700";

  return (
    <div className="border border-surface-200 rounded-md p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-semibold text-surface-900">{rec.title}</h4>
        <span
          className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${impactColor}`}
        >
          {rec.impact}
        </span>
      </div>
      <p className="text-xs text-surface-600 leading-relaxed">
        {rec.description}
      </p>
    </div>
  );
}

