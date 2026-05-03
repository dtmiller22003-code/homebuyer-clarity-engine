"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createRealtorPartner,
  type RealtorPartnerAdminRow,
} from "@/app/actions/realtors";

interface RealtorsAdminClientProps {
  initialPartners: RealtorPartnerAdminRow[];
}

export function RealtorsAdminClient({
  initialPartners,
}: RealtorsAdminClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [partners, setPartners] = useState(initialPartners);
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

  useEffect(() => {
    setPartners(initialPartners);
  }, [initialPartners]);

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
      showToast("success", "Realtor partner created.");
      router.refresh();
    });
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

      <div>
        <h2 className="text-sm font-semibold text-surface-900 mb-3">
          Partners & links
        </h2>
        <ul className="space-y-3">
          {partners.map((p) => {
            const pathLink = `${origin}/apply/realtor/${encodeURIComponent(p.slug)}`;
            const queryLink = `${origin}/apply/short?partner=${encodeURIComponent(p.slug)}`;
            return (
              <li
                key={p.id}
                className="border border-surface-200 rounded-lg p-4 bg-white text-sm"
              >
                <div className="font-medium text-surface-900">{p.displayName}</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  {p.email}
                  {p.phone ? ` · ${p.phone}` : ""} · {p.leadCount} lead
                  {p.leadCount === 1 ? "" : "s"}
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-surface-600 shrink-0">Path link:</span>
                    <code className="bg-surface-100 px-1.5 py-0.5 rounded break-all">
                      {pathLink || `/apply/realtor/${p.slug}`}
                    </code>
                    <button
                      type="button"
                      className="text-brand font-medium"
                      onClick={() =>
                        copyText(
                          "Path link",
                          pathLink || `${typeof window !== "undefined" ? window.location.origin : ""}/apply/realtor/${p.slug}`,
                        )
                      }
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-surface-600 shrink-0">Query link:</span>
                    <code className="bg-surface-100 px-1.5 py-0.5 rounded break-all">
                      {queryLink || `/apply/short?partner=${p.slug}`}
                    </code>
                    <button
                      type="button"
                      className="text-brand font-medium"
                      onClick={() =>
                        copyText(
                          "Query link",
                          queryLink ||
                            `${typeof window !== "undefined" ? window.location.origin : ""}/apply/short?partner=${p.slug}`,
                        )
                      }
                    >
                      Copy
                    </button>
                  </div>
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
    </div>
  );
}
