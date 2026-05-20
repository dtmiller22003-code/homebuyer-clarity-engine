import type {
  LeadPipelineStatus,
  LeadSource,
  LoanPath,
  ReadinessLevel,
} from "@/lib/types";
import { LEAD_SOURCE_LABELS, READINESS_LABELS } from "@/lib/types";
import {
  LEAD_PIPELINE_LABELS,
  LEAD_PIPELINE_STATUSES,
} from "@/lib/lead-pipeline";

export interface FilterState {
  readiness: ReadinessLevel | "ALL";
  loanPath: LoanPath | "ALL";
  leadSource: LeadSource | "ALL";
  assignedTo: string | "ALL";
  pipelineStatus: LeadPipelineStatus | "ALL";
  search: string;
}

interface SidebarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableAssignees: string[];
  totalLeads: number;
  filteredCount: number;
}

export function Sidebar({
  filters,
  onChange,
  availableAssignees,
  totalLeads,
  filteredCount,
}: SidebarProps) {
  const update = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => onChange({ ...filters, [key]: value });

  const reset = () =>
    onChange({
      readiness: "ALL",
      loanPath: "ALL",
      leadSource: "ALL",
      assignedTo: "ALL",
      pipelineStatus: "ALL",
      search: "",
    });

  return (
    <aside className="w-64 bg-white border-r border-surface-200 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-surface-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-900">Filters</h2>
          <button
            onClick={reset}
            className="text-xs text-surface-500 hover:text-surface-800"
          >
            Reset
          </button>
        </div>
        <p className="text-xs text-surface-500 mt-1">
          Showing {filteredCount} of {totalLeads}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1.5">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Name or email"
            className="w-full px-3 py-1.5 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>

        {/* Readiness */}
        <FilterGroup label="Readiness">
          <FilterOption
            label="All"
            active={filters.readiness === "ALL"}
            onClick={() => update("readiness", "ALL")}
          />
          {(
            ["READY_NOW", "NEARLY_READY", "NOT_READY_YET"] as ReadinessLevel[]
          ).map((r) => (
            <FilterOption
              key={r}
              label={READINESS_LABELS[r]}
              active={filters.readiness === r}
              onClick={() => update("readiness", r)}
            />
          ))}
        </FilterGroup>

        {/* Loan Path */}
        <FilterGroup label="Loan Path">
          <FilterOption
            label="All"
            active={filters.loanPath === "ALL"}
            onClick={() => update("loanPath", "ALL")}
          />
          <FilterOption
            label="QM"
            active={filters.loanPath === "QM"}
            onClick={() => update("loanPath", "QM")}
          />
          <FilterOption
            label="Non-QM"
            active={filters.loanPath === "NON_QM"}
            onClick={() => update("loanPath", "NON_QM")}
          />
        </FilterGroup>

        {/* Assigned To */}
        <FilterGroup label="Assigned To">
          <FilterOption
            label="All"
            active={filters.assignedTo === "ALL"}
            onClick={() => update("assignedTo", "ALL")}
          />
          {availableAssignees.map((a) => (
            <FilterOption
              key={a}
              label={a}
              active={filters.assignedTo === a}
              onClick={() => update("assignedTo", a)}
            />
          ))}
        </FilterGroup>

        {/* Pipeline status */}
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1.5">
            Lead status
          </label>
          <select
            value={filters.pipelineStatus}
            onChange={(e) =>
              update(
                "pipelineStatus",
                e.target.value as LeadPipelineStatus | "ALL",
              )
            }
            className="w-full px-3 py-1.5 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
          >
            <option value="ALL">All statuses</option>
            {LEAD_PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_PIPELINE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Lead Source */}
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1.5">
            Lead Source
          </label>
          <select
            value={filters.leadSource}
            onChange={(e) =>
              update("leadSource", e.target.value as LeadSource | "ALL")
            }
            className="w-full px-3 py-1.5 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
          >
            <option value="ALL">All sources</option>
            {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((s) => (
              <option key={s} value={s}>
                {LEAD_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-surface-200">
        <button className="w-full flex items-center gap-2 text-xs text-surface-600 hover:text-surface-900">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-700 mb-1.5">
        {label}
      </label>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
        active
          ? "bg-brand text-white"
          : "text-surface-700 hover:bg-surface-100"
      }`}
    >
      {label}
    </button>
  );
}
