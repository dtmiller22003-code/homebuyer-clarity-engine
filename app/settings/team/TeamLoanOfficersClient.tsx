"use client";

import { useEffect, useMemo, useState } from "react";

export interface LoanOfficerTableRow {
  id: string;
  displayName: string;
  email: string;
  slug: string | null;
  applicationLink: string | null;
}

export function TeamLoanOfficersClient({
  initialLoanOfficers,
}: {
  initialLoanOfficers: LoanOfficerTableRow[];
}) {
  const [rows, setRows] = useState(initialLoanOfficers);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setRows(initialLoanOfficers);
  }, [initialLoanOfficers]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", `${label} copied to clipboard.`);
    } catch {
      showToast("error", "Could not copy — select and copy manually.");
    }
  };

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [rows],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-surface-900">
          Loan officers
        </h2>
        <p className="text-xs text-surface-600">
          Public intake links and optional application URLs. Edit profiles and
          roles in the team section below.
        </p>
        <div className="overflow-x-auto rounded-lg border border-surface-200 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface-50 text-xs font-semibold text-surface-600 uppercase tracking-wide border-b border-surface-200">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap">Name</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Email</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Slug</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Lead link</th>
                <th className="px-3 py-2.5 whitespace-nowrap"> </th>
                <th className="px-3 py-2.5 whitespace-nowrap">
                  Application link
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-surface-500"
                  >
                    No loan officers yet. Use the form above to invite one.
                  </td>
                </tr>
              ) : (
                sortedRows.map((lo) => {
                  const leadPath = lo.slug ? `/apply/lo/${lo.slug}` : null;
                  const leadUrl =
                    leadPath && origin ? `${origin}${leadPath}` : null;
                  return (
                    <tr key={lo.id} className="hover:bg-surface-50/80">
                      <td className="px-3 py-2.5 font-medium text-surface-900 whitespace-nowrap">
                        {lo.displayName}
                      </td>
                      <td className="px-3 py-2.5 text-surface-700 max-w-[220px] truncate">
                        {lo.email}
                      </td>
                      <td className="px-3 py-2.5 text-surface-800 font-mono text-xs">
                        {lo.slug ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-surface-700">
                        {leadPath ? (
                          <code className="text-xs bg-surface-100 px-1.5 py-0.5 rounded break-all">
                            {leadPath}
                          </code>
                        ) : (
                          <span className="text-surface-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {leadUrl ? (
                          <button
                            type="button"
                            className="text-brand font-medium text-xs"
                            onClick={() => copyText("Lead link", leadUrl)}
                          >
                            Copy
                          </button>
                        ) : (
                          <span className="text-surface-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-surface-700 max-w-[260px]">
                        {lo.applicationLink ? (
                          <a
                            href={lo.applicationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline text-xs break-all"
                          >
                            {lo.applicationLink}
                          </a>
                        ) : (
                          <span className="text-surface-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast ? (
        <div
          className={`fixed bottom-4 right-4 text-sm px-4 py-2.5 rounded shadow-lg z-50 ${
            toast.type === "success"
              ? "bg-surface-900 text-white"
              : "bg-red-700 text-white"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
