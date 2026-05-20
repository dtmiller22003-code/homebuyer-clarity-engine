"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lead, LeadStatus } from "@/lib/types";
import { StatsBar } from "@/components/StatsBar";
import { Sidebar, type FilterState } from "@/components/Sidebar";
import { LeadFeed } from "@/components/LeadFeed";
import { DetailPanel, type PanelAction } from "@/components/DetailPanel";
import { TopBar } from "@/components/TopBar";
import { updateLeadStatus } from "@/app/actions/leads";

type SortOption = "newest" | "oldest" | "readiness";

const READINESS_WEIGHT = {
  READY_NOW: 0,
  NEARLY_READY: 1,
  NOT_READY_YET: 2,
};

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

  // Local state is hydrated from server data.
  // Server actions revalidate the page; we also do optimistic updates for snappy UX.
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLeads[0]?.id ?? null,
  );
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [toast, setToast] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    readiness: "ALL",
    loanPath: "ALL",
    leadSource: "ALL",
    assignedTo: "ALL",
    search: "",
  });

  const availableAssignees = useMemo(() => {
    const set = new Set(leads.map((l) => l.assignedTo));
    return Array.from(set).sort();
  }, [leads]);

  const visibleLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      if (lead.status === "archived" && filters.readiness === "ALL") {
        // Archived leads still show in the list until a "show archived" control exists
      }
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

  // Show a toast briefly
  const flashToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  // Map an action to the new status
  const actionToStatus = (action: PanelAction): LeadStatus | null => {
    switch (action) {
      case "approve":
        return "approved";
      case "archive":
        return "archived";
      case "send_to_crm":
        return "sent_to_crm";
    }
  };

  const handleAction = (action: PanelAction, lead: Lead) => {
    const newStatus = actionToStatus(action);
    if (!newStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, status: newStatus, lastUpdated: new Date().toISOString() }
          : l,
      ),
    );

    startTransition(async () => {
      const result = await updateLeadStatus({
        leadId: lead.id,
        status: newStatus,
      });

      if (!result.ok) {
        // Revert on failure
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? lead : l)),
        );
        flashToast(`Failed: ${result.error}`);
        return;
      }

      // Action-specific toasts
      if (action === "send_to_crm") {
        flashToast(
          `${lead.firstName} ${lead.lastName} marked for handoff (internal status only, not a CRM send).`,
        );
      } else if (action === "approve") {
        flashToast(`${lead.firstName} ${lead.lastName} approved.`);
      } else if (action === "archive") {
        flashToast(`${lead.firstName} ${lead.lastName} archived.`);
      }

      // Let Next.js refresh from server too so we stay in sync
      router.refresh();
    });
  };

  return (
    <div className="h-screen flex flex-col bg-surface-50">
      <TopBar user={currentUser} />
      <StatsBar leads={leads} />

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
            />
          </div>

          <div className="w-[440px] border-l border-surface-200 shrink-0">
            <DetailPanel
              lead={selectedLead}
              onAction={handleAction}
              disabled={isPending}
            />
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-surface-900 text-white text-sm px-4 py-2.5 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
