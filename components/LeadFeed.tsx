"use client";

import { useLayoutEffect, useRef } from "react";
import type { Lead, LeadPipelineStatus } from "@/lib/types";
import { LeadCard } from "./LeadCard";

type SortOption = "newest" | "oldest" | "readiness";

interface LeadFeedProps {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showAdminDelete?: boolean;
  onAdminDeleteLead?: (lead: Lead) => void;
  deleteDisabled?: boolean;
  showBulkCheckbox?: boolean;
  bulkSelectedIds?: string[];
  onBulkToggle?: (leadId: string, checked: boolean) => void;
  bulkDisabled?: boolean;
  allVisibleSelected?: boolean;
  someVisibleSelected?: boolean;
  onSelectAllVisible?: () => void;
  /** Staff dashboard — show intake attribution (realtor / LO / company). */
  showIntakeSource?: boolean;
  showPipelineEditor?: boolean;
  onPipelineChange?: (leadId: string, status: LeadPipelineStatus) => void;
}

export function LeadFeed({
  leads,
  selectedId,
  onSelect,
  sortBy,
  onSortChange,
  showAdminDelete,
  onAdminDeleteLead,
  deleteDisabled,
  showBulkCheckbox,
  bulkSelectedIds = [],
  onBulkToggle,
  bulkDisabled,
  allVisibleSelected,
  someVisibleSelected,
  onSelectAllVisible,
  showIntakeSource,
  showPipelineEditor,
  onPipelineChange,
}: LeadFeedProps) {
  const bulkSet = new Set(bulkSelectedIds);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = !!someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  return (
    <div className="flex flex-col h-full bg-surface-50">
      {/* Feed header */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-surface-200 bg-white flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-surface-900 shrink-0">
            Leads ({leads.length})
          </h2>
          {showBulkCheckbox && leads.length > 0 ? (
            <label className="flex items-center gap-2 text-xs text-surface-700 cursor-pointer select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="h-4 w-4 rounded border-surface-300 text-brand focus:ring-brand"
                checked={!!allVisibleSelected}
                disabled={bulkDisabled}
                onChange={() => onSelectAllVisible?.()}
              />
              <span>Select all visible</span>
            </label>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-surface-500">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="text-xs border border-surface-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="readiness">Readiness (Strongest)</option>
          </select>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-medium text-surface-700">
              No leads match current filters
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Adjust filters in the sidebar
            </p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selected={lead.id === selectedId}
              onSelect={() => onSelect(lead.id)}
              showAdminDelete={showAdminDelete}
              onAdminDelete={onAdminDeleteLead}
              deleteDisabled={deleteDisabled}
              showBulkCheckbox={showBulkCheckbox}
              bulkChecked={bulkSet.has(lead.id)}
              onBulkToggle={onBulkToggle}
              bulkDisabled={bulkDisabled}
              showIntakeSource={showIntakeSource}
              showPipelineEditor={showPipelineEditor}
              onPipelineChange={onPipelineChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
