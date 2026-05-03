"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/types";
import { StatsBar } from "@/components/StatsBar";
import { Sidebar, type FilterState } from "@/components/Sidebar";
import { LeadFeed } from "@/components/LeadFeed";
import { DetailPanel } from "@/components/DetailPanel";
import { TopBar } from "@/components/TopBar";
import { deleteLead } from "@/app/actions/leads";
import { downloadLeadsCsv } from "@/lib/export-leads-csv";
import { isAdminRole, isInternalStaffRole } from "@/lib/auth-roles";

type SortOption = "newest" | "oldest" | "readiness";

const READINESS_WEIGHT = {
  READY_NOW: 0,
  NEARLY_READY: 1,
  NOT_READY_YET: 2,
};

const DELETE_LEAD_CONFIRM =
  "Are you sure you want to delete this lead? This cannot be undone.";

interface DashboardClientProps {
  initialLeads: Lead[];
  currentUser: { displayName: string; email: string; role: string };
}

export function DashboardClient({
  initialLeads,
  currentUser,
}: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
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

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  const flashToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleExportCsv = () => {
    downloadLeadsCsv(visibleLeads, "leads-export.csv");
    flashToast("success", "Export started — check your downloads.");
  };

  const handleAdminDeleteLead = (lead: Lead) => {
    if (!window.confirm(DELETE_LEAD_CONFIRM)) return;

    startTransition(async () => {
      const result = await deleteLead(lead.id);
      if (!result.ok) {
        flashToast("error", result.error);
        return;
      }
      flashToast("success", "Lead deleted successfully.");
      router.refresh();
    });
  };

  return (
    <div className="h-screen flex flex-col bg-surface-50">
      <TopBar user={currentUser} />
      <StatsBar leads={leads} />

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

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          filters={filters}
          onChange={setFilters}
          availableAssignees={availableAssignees}
          totalLeads={leads.length}
          filteredCount={visibleLeads.length}
        />

        <main className="flex-1 flex min-w-0">
          <div className="flex-1 min-w-0">
            <LeadFeed
              leads={visibleLeads}
              selectedId={selectedId}
              onSelect={setSelectedId}
              sortBy={sortBy}
              onSortChange={setSortBy}
              showAdminDelete={canDeleteLeads}
              onAdminDeleteLead={handleAdminDeleteLead}
              deleteDisabled={isPending}
            />
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
