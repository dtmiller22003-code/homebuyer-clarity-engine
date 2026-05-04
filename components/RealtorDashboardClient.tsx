"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";
import { READINESS_LABELS } from "@/lib/types";
import { LeadLinkShareCard } from "@/components/LeadLinkShareCard";
import { LeadPipelineBadge } from "@/components/LeadPipelineUi";
import { TopBar } from "@/components/TopBar";

interface RealtorDashboardClientProps {
  leads: Lead[];
  partnerBranding: {
    displayName: string;
    personalLogoUrl: string | null;
    subtitle: string | null;
  } | null;
  /** Full apply URL for this partner only; null if origin or slug missing */
  partnerLeadLink: string | null;
  partnerLeadLinkUnavailableHint: string;
  currentUser: { displayName: string; email: string; role: string };
}

export function RealtorDashboardClient({
  leads,
  partnerBranding,
  partnerLeadLink,
  partnerLeadLinkUnavailableHint,
  currentUser,
}: RealtorDashboardClientProps) {
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const flashToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <TopBar user={currentUser} />

      <div className="p-6 max-w-4xl mx-auto w-full">
        <LeadLinkShareCard
          title="My Lead Link"
          helperText="Share this link with buyers. All submissions will be tracked to you."
          linkUrl={partnerLeadLink}
          unavailableHint={partnerLeadLinkUnavailableHint}
          onToast={flashToast}
        />

        {partnerBranding?.personalLogoUrl || partnerBranding?.subtitle ? (
          <div className="mb-6 rounded-lg border border-surface-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            {partnerBranding.personalLogoUrl ? (
              <img
                src={partnerBranding.personalLogoUrl}
                alt=""
                className="h-12 w-auto max-w-[200px] object-contain shrink-0"
              />
            ) : null}
            {partnerBranding.subtitle ? (
              <p className="text-sm text-surface-700 leading-snug">
                {partnerBranding.subtitle}
              </p>
            ) : null}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold text-surface-900">Your leads</h1>
        <p className="text-sm text-surface-600 mt-1 mb-6">
          Leads attributed to your partner account appear here.
        </p>

        {leads.length === 0 ? (
          <p className="text-sm text-surface-600 border border-dashed border-surface-200 rounded-lg p-8 text-center">
            No leads yet. Share your apply link with buyers to see them here.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-surface-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-100 text-left text-xs font-semibold uppercase tracking-wide text-surface-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Lead status</th>
                  <th className="px-4 py-3">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-surface-900">
                      {l.firstName} {l.lastName}
                    </td>
                    <td className="px-4 py-3 text-surface-700">{l.email}</td>
                    <td className="px-4 py-3 text-surface-700">{l.phone}</td>
                    <td className="px-4 py-3">
                      <LeadPipelineBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-surface-700">
                      {READINESS_LABELS[l.decision.readiness]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast ? (
        <div
          className={`fixed bottom-4 right-4 text-sm px-4 py-2.5 rounded shadow-lg ${
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
