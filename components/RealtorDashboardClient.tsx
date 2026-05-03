"use client";

import type { Lead } from "@/lib/types";
import { READINESS_LABELS } from "@/lib/types";
import { TopBar } from "@/components/TopBar";

interface RealtorDashboardClientProps {
  leads: Lead[];
  currentUser: { displayName: string; email: string; role: string };
}

export function RealtorDashboardClient({
  leads,
  currentUser,
}: RealtorDashboardClientProps) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <TopBar user={currentUser} />

      <div className="p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-semibold text-surface-900">Your leads</h1>
        <p className="text-sm text-surface-600 mt-1 mb-6">
          Leads submitted through your personal link appear here.
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
                  <th className="px-4 py-3">Status</th>
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
                    <td className="px-4 py-3 text-surface-700">{l.status}</td>
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
    </div>
  );
}
