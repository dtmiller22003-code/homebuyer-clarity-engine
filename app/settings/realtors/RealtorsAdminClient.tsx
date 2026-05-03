"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  RealtorLeaderboardSnapshot,
  RealtorPerformanceAdminRow,
} from "@/app/actions/realtor-performance";
import {
  createRealtorPartner,
  deactivateRealtorPartner,
  deleteRealtorPartnerPermanently,
  updateRealtorPartnerBranding,
} from "@/app/actions/realtors";
import { RealtorPerformanceLeaderboards } from "@/components/RealtorPerformanceLeaderboards";

type SortKey = "total" | "recent" | "conversion";
type FilterMode = "all" | "active" | "top";

function isPartnerLive(p: RealtorPerformanceAdminRow): boolean {
  return p.isActive && !p.deletedAt;
}

function isTopPerformer(r: RealtorPerformanceAdminRow): boolean {
  if (r.rowKind === "historical") return false;
  if (r.deletedAt) return false;
  if (r.leadCount >= 5) return true;
  if (r.leadCount >= 2 && (r.conversionRatePercent ?? 0) >= 25) return true;
  if (r.leadsLast30Days >= 4) return true;
  return false;
}

function formatLeadDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

interface RealtorsAdminClientProps {
  initialRows: RealtorPerformanceAdminRow[];
  leaderboards: RealtorLeaderboardSnapshot;
}

export function RealtorsAdminClient({
  initialRows,
  leaderboards,
}: RealtorsAdminClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [partners, setPartners] = useState(initialRows);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<RealtorPerformanceAdminRow | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  useEffect(() => {
    setPartners(initialRows);
  }, [initialRows]);

  const displayPartners = useMemo(() => {
    let list = [...partners];
    if (filterMode === "active") list = list.filter((p) => isPartnerLive(p));
    if (filterMode === "top") list = list.filter(isTopPerformer);
    list.sort((a, b) => {
      if (sortKey === "total") {
        if (b.leadCount !== a.leadCount) return b.leadCount - a.leadCount;
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortKey === "recent") {
        const ta = a.lastLeadAt ? new Date(a.lastLeadAt).getTime() : 0;
        const tb = b.lastLeadAt ? new Date(b.lastLeadAt).getTime() : 0;
        if (tb !== ta) return tb - ta;
        if (b.leadsLast30Days !== a.leadsLast30Days)
          return b.leadsLast30Days - a.leadsLast30Days;
        return a.displayName.localeCompare(b.displayName);
      }
      const ca = a.conversionRatePercent ?? -1;
      const cb = b.conversionRatePercent ?? -1;
      if (cb !== ca) return cb - ca;
      if (b.leadCount !== a.leadCount) return b.leadCount - a.leadCount;
      return a.displayName.localeCompare(b.displayName);
    });
    return list;
  }, [partners, filterMode, sortKey]);

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await createRealtorPartner({
        displayName,
        email,
        phone: phone.trim() || undefined,
        slug: slug.trim() || undefined,
        brokerage: brokerage.trim() || undefined,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setDisplayName("");
      setEmail("");
      setPhone("");
      setSlug("");
      setBrokerage("");
      showToast(
        "success",
        result.invitationSent
          ? "Partner created. An invitation email was sent so they can sign in."
          : "Partner created and linked to their existing account. No new invite email was sent.",
      );
      router.refresh();
    });
  };

  const handleDeactivate = (partnerId: string) => {
    if (
      !window.confirm(
        "Deactivate this partner? Their public apply link will stop working, they will lose dashboard access, and historical leads stay in your org.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deactivateRealtorPartner(partnerId);
      if (!res.ok) {
        showToast("error", res.error);
        return;
      }
      showToast("success", "Partner deactivated.");
      router.refresh();
    });
  };

  const handleConfirmPermanentDelete = () => {
    if (!deleteTarget) return;
    if (deleteConfirmInput !== "DELETE") {
      showToast("error", 'Type DELETE exactly to confirm.');
      return;
    }
    startTransition(async () => {
      const res = await deleteRealtorPartnerPermanently({
        partnerId: deleteTarget.id,
        confirmation: "DELETE",
      });
      if (!res.ok) {
        showToast("error", res.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteConfirmInput("");
      showToast(
        "success",
        "Partner removed from active use. Their record and lead history are kept.",
      );
      router.refresh();
    });
  };

  const savePartnerBranding = (p: RealtorPerformanceAdminRow) => {
    startTransition(async () => {
      const res = await updateRealtorPartnerBranding({
        partnerId: p.id,
        personalLogoUrl: p.personalLogoUrl?.trim() || null,
        subtitle: p.subtitle?.trim() || null,
        defaultApplicationLink: p.defaultApplicationLink?.trim() || null,
      });
      if (!res.ok) {
        showToast("error", res.error);
        return;
      }
      showToast("success", "Partner branding saved.");
      router.refresh();
    });
  };

  const setPartnerField = (
    id: string,
    field: keyof Pick<
      RealtorPerformanceAdminRow,
      "personalLogoUrl" | "subtitle" | "defaultApplicationLink"
    >,
    value: string,
  ) => {
    setPartners((prev) =>
      prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    );
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        className="max-w-lg space-y-3 border border-surface-200 rounded-lg p-4 bg-white"
      >
        <h2 className="text-sm font-semibold text-surface-900">Add partner</h2>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Name
          </label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Email
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Phone (optional)
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            URL slug (optional — auto from name if empty)
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. sarah-smith"
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Brokerage (optional)
          </label>
          <input
            value={brokerage}
            onChange={(e) => setBrokerage(e.target.value)}
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        {formError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create partner"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-surface-900">
          Performance overview
        </h2>
        <p className="text-xs text-surface-600">
          Admin-only metrics from leads attributed to each partner. Converted =
          approved or sent to CRM.
        </p>
        <RealtorPerformanceLeaderboards
          data={leaderboards}
          headingClassName="text-[11px] font-semibold text-surface-500 uppercase tracking-wide"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-surface-900">
            Partner performance
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-surface-600 self-center mr-1">Sort:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded border border-surface-300 bg-white px-2 py-1.5 text-surface-800"
            >
              <option value="total">Total leads</option>
              <option value="recent">Recent activity</option>
              <option value="conversion">Conversion rate</option>
            </select>
            <span className="text-surface-600 self-center ml-2 mr-1">Filter:</span>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-md px-2.5 py-1.5 font-medium border ${
                filterMode === "all"
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-surface-300 bg-white text-surface-700 hover:bg-surface-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("active")}
              className={`rounded-md px-2.5 py-1.5 font-medium border ${
                filterMode === "active"
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-surface-300 bg-white text-surface-700 hover:bg-surface-50"
              }`}
            >
              Active only
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("top")}
              className={`rounded-md px-2.5 py-1.5 font-medium border ${
                filterMode === "top"
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-surface-300 bg-white text-surface-700 hover:bg-surface-50"
              }`}
            >
              Top performers
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-surface-200 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface-50 text-xs font-semibold text-surface-600 uppercase tracking-wide border-b border-surface-200">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap">Name</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Email</th>
                <th className="px-3 py-2.5 whitespace-nowrap text-right">
                  Total leads
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap text-right">
                  Leads (30 days)
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap text-right">
                  Conversion %
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap">Last lead</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {displayPartners.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-surface-500"
                  >
                    No partners match this filter.
                  </td>
                </tr>
              ) : (
                displayPartners.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-50/80">
                    <td className="px-3 py-2.5 font-medium text-surface-900 whitespace-nowrap">
                      {p.displayName}
                    </td>
                    <td className="px-3 py-2.5 text-surface-700 max-w-[200px] truncate">
                      {p.email}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-surface-800">
                      {p.leadCount}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-surface-800">
                      {p.leadsLast30Days}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-surface-800">
                      {p.conversionRatePercent === null
                        ? "—"
                        : `${p.conversionRatePercent}%`}
                    </td>
                    <td className="px-3 py-2.5 text-surface-700 whitespace-nowrap">
                      {formatLeadDate(p.lastLeadAt)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {p.rowKind === "historical" ? (
                        <span className="text-surface-700 font-medium">Historical</span>
                      ) : p.deletedAt ? (
                        <span className="text-amber-900 font-medium">Removed</span>
                      ) : p.isActive ? (
                        <span className="text-emerald-800 font-medium">Active</span>
                      ) : (
                        <span className="text-surface-500 font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-surface-900 mb-3">
          Partners & links
        </h2>
        <ul className="space-y-3">
          {displayPartners.map((p) => {
            const publicLeadLink = `${origin}/apply/realtor/${encodeURIComponent(p.slug)}`;
            const privateDashboardLink = `${origin}/realtor`;
            return (
              <li
                key={p.id}
                className="border border-surface-200 rounded-lg p-4 bg-white text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-surface-900">{p.displayName}</div>
                  {p.rowKind === "historical" ? (
                    <span className="inline-flex items-center rounded-full bg-surface-200 text-surface-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      Historical
                    </span>
                  ) : p.deletedAt ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      Removed
                    </span>
                  ) : !p.isActive ? (
                    <span className="inline-flex items-center rounded-full bg-surface-200 text-surface-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {p.email}
                  {p.phone ? ` · ${p.phone}` : ""} · {p.leadCount} lead
                  {p.leadCount === 1 ? "" : "s"}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {isPartnerLive(p) ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDeactivate(p.id)}
                      className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  ) : null}
                  {!p.deletedAt && p.rowKind !== "historical" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setDeleteTarget(p);
                        setDeleteConfirmInput("");
                      }}
                      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove partner…
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-surface-600 shrink-0 font-medium">
                      Public lead link
                    </span>
                    <code className="bg-surface-100 px-1.5 py-0.5 rounded break-all">
                      {publicLeadLink || `/apply/realtor/${p.slug}`}
                    </code>
                    <button
                      type="button"
                      className="text-brand font-medium"
                      onClick={() =>
                        copyText(
                          "Public lead link",
                          publicLeadLink ||
                            `${typeof window !== "undefined" ? window.location.origin : ""}/apply/realtor/${p.slug}`,
                        )
                      }
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-surface-600 shrink-0 font-medium">
                      Private dashboard (login)
                    </span>
                    <code className="bg-surface-100 px-1.5 py-0.5 rounded break-all">
                      {privateDashboardLink}
                    </code>
                    <button
                      type="button"
                      className="text-brand font-medium"
                      onClick={() =>
                        copyText("Private dashboard link", privateDashboardLink)
                      }
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-100 space-y-2">
                  <p className="text-xs font-semibold text-surface-800">
                    Partner branding (optional)
                  </p>
                  {!isPartnerLive(p) && !p.deletedAt && p.rowKind !== "historical" ? (
                    <p className="text-xs text-surface-500">
                      Branding can still be edited; the partner cannot sign in while
                      inactive.
                    </p>
                  ) : null}
                  {p.rowKind === "historical" ? (
                    <p className="text-xs text-surface-500">
                      Leads attributed to a removed partner link (no partner row). Stats
                      use saved slug / display name on each lead.
                    </p>
                  ) : null}
                  {p.deletedAt ? (
                    <p className="text-xs text-surface-500">
                      This partner was removed from active use. The record is kept for
                      reporting; branding cannot be changed here.
                    </p>
                  ) : null}
                  <label className="block text-[11px] text-surface-600">
                    Personal logo URL (https)
                    <input
                      value={p.personalLogoUrl ?? ""}
                      onChange={(e) =>
                        setPartnerField(p.id, "personalLogoUrl", e.target.value)
                      }
                      disabled={!!p.deletedAt || p.rowKind === "historical"}
                      className="mt-0.5 w-full rounded border border-surface-300 px-2 py-1.5 text-xs disabled:bg-surface-100 disabled:text-surface-500"
                      placeholder="https://…"
                    />
                  </label>
                  <label className="block text-[11px] text-surface-600">
                    Subtitle
                    <input
                      value={p.subtitle ?? ""}
                      onChange={(e) =>
                        setPartnerField(p.id, "subtitle", e.target.value)
                      }
                      disabled={!!p.deletedAt || p.rowKind === "historical"}
                      className="mt-0.5 w-full rounded border border-surface-300 px-2 py-1.5 text-xs disabled:bg-surface-100 disabled:text-surface-500"
                      placeholder="In partnership with …"
                    />
                  </label>
                  <label className="block text-[11px] text-surface-600">
                    Custom apply redirect (optional https)
                    <input
                      value={p.defaultApplicationLink ?? ""}
                      onChange={(e) =>
                        setPartnerField(
                          p.id,
                          "defaultApplicationLink",
                          e.target.value,
                        )
                      }
                      disabled={!!p.deletedAt || p.rowKind === "historical"}
                      className="mt-0.5 w-full rounded border border-surface-300 px-2 py-1.5 text-xs disabled:bg-surface-100 disabled:text-surface-500"
                      placeholder="Company default if blank"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending || !!p.deletedAt || p.rowKind === "historical"}
                    onClick={() => savePartnerBranding(p)}
                    className="rounded-md border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-800 hover:bg-surface-50 disabled:opacity-50"
                  >
                    Save branding
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
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
          {toast.text}
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-realtor-title"
        >
          <div className="w-full max-w-md rounded-lg border border-surface-200 bg-white p-5 shadow-xl">
            <h3
              id="delete-realtor-title"
              className="text-base font-semibold text-surface-900"
            >
              Remove {deleteTarget.displayName}?
            </h3>
            <p className="mt-2 text-sm text-surface-600 leading-relaxed">
              This turns off their dashboard and public apply link. Their partner
              record stays in the database for reporting,{" "}
              <strong className="font-semibold text-surface-800">
                leads are not deleted
              </strong>
              , and{" "}
              <strong className="font-semibold text-surface-800">
                lead attribution is unchanged
              </strong>
              . Their Supabase login is kept (no auth user deletion).
            </p>
            <label className="mt-4 block text-xs font-medium text-surface-800">
              Type DELETE to confirm removal
            </label>
            <input
              autoComplete="off"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              className="mt-1 w-full rounded border border-surface-300 px-3 py-2 text-sm font-mono"
              placeholder="DELETE"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-800 hover:bg-surface-50"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmInput("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || deleteConfirmInput !== "DELETE"}
                onClick={handleConfirmPermanentDelete}
                className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                Remove partner
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
