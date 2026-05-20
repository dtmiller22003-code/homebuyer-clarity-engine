import type { Lead } from "@/lib/types";

interface StatsBarProps {
  leads: Lead[];
}

interface StatCardProps {
  label: string;
  value: number;
  sublabel?: string;
  accent: "blue" | "green" | "yellow" | "red";
}

const accentClasses: Record<StatCardProps["accent"], string> = {
  blue: "border-l-blue-500",
  green: "border-l-green-500",
  yellow: "border-l-yellow-500",
  red: "border-l-red-500",
};

function StatCard({ label, value, sublabel, accent }: StatCardProps) {
  return (
    <div
      className={`flex-1 bg-white border border-surface-200 border-l-4 ${accentClasses[accent]} rounded-md px-4 py-3`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-surface-500">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-semibold text-surface-900">{value}</span>
        {sublabel && (
          <span className="text-xs text-surface-500">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

export function StatsBar({ leads }: StatsBarProps) {
  const newLeads = leads.filter((l) => l.status === "new").length;
  const readyNow = leads.filter((l) => l.decision.readiness === "READY_NOW")
    .length;
  const almostReady = leads.filter(
    (l) => l.decision.readiness === "NEARLY_READY",
  ).length;
  const notReady = leads.filter(
    (l) => l.decision.readiness === "NOT_READY_YET",
  ).length;

  return (
    <div className="flex gap-3 px-6 py-4 bg-white border-b border-surface-200">
      <StatCard
        label="New Leads"
        value={newLeads}
        sublabel="stage: new"
        accent="blue"
      />
      <StatCard
        label="Ready Now"
        value={readyNow}
        sublabel="workable deals"
        accent="green"
      />
      <StatCard
        label="Almost Ready"
        value={almostReady}
        sublabel="fixable"
        accent="yellow"
      />
      <StatCard
        label="Not Ready"
        value={notReady}
        sublabel="needs work"
        accent="red"
      />
    </div>
  );
}
