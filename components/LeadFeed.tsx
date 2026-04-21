import type { Lead } from "@/lib/types";
import { LeadCard } from "./LeadCard";

type SortOption = "newest" | "oldest" | "readiness";

interface LeadFeedProps {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function LeadFeed({
  leads,
  selectedId,
  onSelect,
  sortBy,
  onSortChange,
}: LeadFeedProps) {
  return (
    <div className="flex flex-col h-full bg-surface-50">
      {/* Feed header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200 bg-white">
        <h2 className="text-sm font-semibold text-surface-900">
          Leads ({leads.length})
        </h2>
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
              onClick={() => onSelect(lead.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
