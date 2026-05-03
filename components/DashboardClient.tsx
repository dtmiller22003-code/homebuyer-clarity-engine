"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/types";
import { StatsBar } from "@/components/StatsBar";
import { Sidebar, type FilterState } from "@/components/Sidebar";
import { LeadFeed } from "@/components/LeadFeed";
import { DetailPanel } from "@/components/DetailPanel";
import { TopBar } from "@/components/TopBar";
import { bulkDeleteLeads, deleteLead } from "@/app/actions/leads";
import type { RealtorLeaderboardSnapshot } from "@/app/actions/realtor-performance";
import { downloadLeadsCsv } from "@/lib/export-leads-csv";
import { isAdminRole, isInternalStaffRole } from "@/lib/auth-roles";
import { RealtorPerformanceLeaderboards } from "@/components/RealtorPerformanceLeaderboards";

type SortOption = "newest" | "oldest" | "readiness";

const READINESS_WEIGHT = {
  READY_NOW: 0,
  NEARLY_READY: 1,
  NOT_READY_YET: 2,
};

const DELETE_LEAD_CONFIRM =
  "Are you sure you want to delete this lead? This cannot be undone.";

const BULK_DELETE_CONFIRM =
  "Are you sure you want to delete the selected leads? This cannot be undone.";

const MAX_BULK_DELETE_LEADS = 100;
const BULK_DELETE_TOO_MANY_MSG =
  "You can delete up to 100 leads at a time.";

interface DashboardClientProps {
  initialLeads: Lead[];
  currentUser: { displayName: string; email: string; role: string };
  /** Admin-only; omitted or null for loan officers. */
  realtorLeaderboards?: RealtorLeaderboardSnapshot | null;
}

export function DashboardClient({
  initialLeads,
  currentUser,
  realtorLeaderboards = null,
}: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const leadsRef = useRef(leads);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLeads[0]?.id ?? null,
  );
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    readiness: "ALL",
    loanPath: "ALL",
    leadSource: "ALL",
    assignedTo: "ALL",
    search: "",
  });
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    setSelectedId((sid) => {
      if (sid && initialLeads.some((l) => l.id === sid)) return sid;
      return initialLeads[0]?.id ?? null;
    });
  }, [initialLeads]);

  const canExport = isInternalStaffRole(currentUser.role);
  const canDeleteLeads = isAdminRole(currentUser.role);

  const availableAssignees = useMemo(() => {
    const set = new Set(leads.map((l) => l.assignedTo));
    return Array.from(set).sort();
  }, [leads]);

  const visibleLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      if (
        filters.readiness !== "ALL" &&
        lead.decision.readiness !== filters.readiness
      )
        return false;
      if (
        filters.loanPath !== "ALL" &&
        lead.decision.loanPath !== filters.loanPath
      )
        return false;
      if (
        filters.leadSource !== "ALL" &&
        lead.leadSource !== filters.leadSource
      )
        return false;
      if (
        filters.assignedTo !== "ALL" &&
        lead.assignedTo !== filters.assignedTo
      )
        return false;
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const name = `${lead.firstName} ${lead.lastName}`.toLowerCase();
        if (!name.includes(q) && !lead.email.toLowerCase().includes(q))
          return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
        );
      }
      const aw = READINESS_WEIGHT[a.decision.readiness];
      const bw = READINESS_WEIGHT[b.decision.readiness];
      if (aw !== bw) return aw - bw;
      return b.decision.strongPillarCount - a.decision.strongPillarCount;
    });
  }, [leads, filters, sortBy]);

  useEffect(() => {
    const visible = new Set(visibleLeads.map((l) => l.id));
    setBulkSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [visibleLeads]);

  const allVisibleSelected = useMemo(
    () =>
      visibleLeads.length > 0 &&
      visibleLeads.every((l) => bulkSelectedIds.includes(l.id)),
    [visibleLeads, bulkSelectedIds],
  );

  const someVisibleSelected = useMemo(
    () => visibleLeads.some((l) => bulkSelectedIds.includes(l.id)),
    [visibleLeads, bulkSelectedIds],
  );

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  const flashToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleExportCsv = () => {
    downloadLeadsCsv(visibleLeads, "leads-export.csv");
    flashToast("success", "Export started — check your downloads.");
  };

  const handleBulkToggle = (leadId: string, checked: boolean) => {
    setBulkSelectedIds((prev) =>
      checked
        ? prev.includes(leadId)
          ? prev
          : [...prev, leadId]
        : prev.filter((id) => id !== leadId),
    );
  };

  const handleSelectAllVisible = () => {
    const ids = visibleLeads.map((l) => l.id);
    if (ids.length === 0) return;
    setBulkSelectedIds((prev) => {
      const allOn = ids.every((id) => prev.includes(id));
      if (allOn) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const handleAdminDeleteLead = (lead: Lead) => {
    if (!window.confirm(DELETE_LEAD_CONFIRM)) return;

    startTransition(async () => {
      const result = await deleteLead(lead.id);
      if (!result.ok) {
        flashToast("error", result.error);
        return;
      }
      setBulkSelectedIds((prev) => prev.filter((id) => id !== lead.id));
      flashToast("success", "Lead deleted successfully.");
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    if (bulkSelectedIds.length === 0) return;
    if (bulkSelectedIds.length > MAX_BULK_DELETE_LEADS) {
      flashToast("error", BULK_DELETE_TOO_MANY_MSG);
      return;
    }
    if (!window.confirm(BULK_DELETE_CONFIRM)) return;

    const idsToDelete = [...bulkSelectedIds];

    startTransition(async () => {
      const result = await bulkDeleteLeads(idsToDelete);
      if (!result.ok) {
        flashToast("error", result.error);
        return;
      }

      const next = leadsRef.current.filter((l) => !idsToDelete.includes(l.id));
      setLeads(next);
      leadsRef.current = next;
      setBulkSelectedIds([]);
      setSelectedId((cur) => {
        if (cur && idsToDelete.includes(cur)) {
          return next[0]?.id ?? null;
        }
        return cur;
      });
      flashToast("success", "Selected leads deleted successfully.");
      router.refresh();
    });
  };

  return (
    <div className="h-screen flex flex-col bg-surface-50">
      <TopBar user={currentUser} />
      <StatsBar leads={leads} />

      {realtorLeaderboards &&
      (realtorLeaderboards.topThisMonth.length > 0 ||
        realtorLeaderboards.topConverters.length > 0) ? (
        <div className="shrink-0 px-6 py-3 bg-white border-b border-surface-200">
          <p className="text-[11px] font-medium text-surface-500 uppercase tracking-wide mb-2">
            Realtor performance (admin only)
          </p>
          <RealtorPerformanceLeaderboards data={realtorLeaderboards} />
        </div>
      ) : null}

      {canExport ? (
        <div className="px-6 py-2 flex justify-end bg-white border-b border-surface-200">
          <button
            type="button"
            onClick={handleExportCsv}
            className="text-sm font-medium text-surface-800 border border-surface-300 rounded-md px-3 py-1.5 hover:bg-surface-50"
          >
            Export to CSV
          </button>
        </div>
      ) : null}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar
          filters={filters}
          onChange={setFilters}
          availableAssignees={availableAssignees}
          totalLeads={leads.length}
          filteredCount={visibleLeads.length}
        />

        <main className="flex-1 flex min-w-0 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {canDeleteLeads && bulkSelectedIds.length > 0 ? (
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-surface-200 bg-red-50/90">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-surface-800">
                    {bulkSelectedIds.length} selected
                  </span>
                  {bulkSelectedIds.length > MAX_BULK_DELETE_LEADS ? (
                    <span className="text-sm text-red-800 font-medium">
                      {BULK_DELETE_TOO_MANY_MSG}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={
                    isPending ||
                    bulkSelectedIds.length > MAX_BULK_DELETE_LEADS
                  }
                  className="text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  Delete selected
                </button>
              </div>
            ) : null}
            <div className="flex-1 min-h-0 min-w-0">
              <LeadFeed
                leads={visibleLeads}
                selectedId={selectedId}
                onSelect={setSelectedId}
                sortBy={sortBy}
                onSortChange={setSortBy}
                showAdminDelete={canDeleteLeads}
                onAdminDeleteLead={handleAdminDeleteLead}
                deleteDisabled={isPending}
                showBulkCheckbox={canDeleteLeads}
                bulkSelectedIds={bulkSelectedIds}
                onBulkToggle={handleBulkToggle}
                bulkDisabled={isPending}
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                onSelectAllVisible={handleSelectAllVisible}
                showIntakeSource={isInternalStaffRole(currentUser.role)}
              />
            </div>
          </div>

          <div className="w-[440px] border-l border-surface-200 shrink-0">
            <DetailPanel lead={selectedLead} />
          </div>
        </main>
      </div>

      {toast ? (
        <div
          className={`fixed bottom-4 right-4 text-sm px-4 py-2.5 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-surface-900 text-white"
              : "bg-red-700 text-white"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
