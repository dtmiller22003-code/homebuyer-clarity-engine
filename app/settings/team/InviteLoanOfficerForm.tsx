"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { provisionLoanOfficer } from "@/app/actions/settings";
import { slugifyPublicProfile } from "@/lib/slugify";

const cleanSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

export function InviteLoanOfficerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const res = await provisionLoanOfficer({
        displayName: displayName.trim(),
        email: email.trim(),
        slug: slug.trim(),
        applicationLink: applicationLink.trim() || undefined,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setDisplayName("");
      setEmail("");
      setSlug("");
      setApplicationLink("");
      showToast("success", "Loan officer invited");
      router.refresh();
    });
  };

  return (
    <>
      <form
        onSubmit={handleInvite}
        className="max-w-lg space-y-3 border border-surface-200 rounded-lg p-4 bg-white"
      >
        <h2 className="text-sm font-semibold text-surface-900">
          Invite Loan Officer
        </h2>
        <p className="text-xs text-surface-600 leading-relaxed">
          Creates their account, adds them as{" "}
          <code className="text-[11px] bg-surface-100 px-1 rounded">
            loan_officer
          </code>
          , and enables{" "}
          <code className="text-[11px] bg-surface-100 px-1 rounded">
            /apply/lo/your-slug
          </code>
          .
        </p>
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
            Slug
          </label>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(cleanSlug(e.target.value))}
            placeholder="e.g. jane-smith"
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-[11px] text-surface-500">
            Lowercase, dash-separated (stored as{" "}
            {slug.trim() ? slugifyPublicProfile(slug) || "…" : "…"}).
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Application link (optional)
          </label>
          <input
            type="url"
            inputMode="url"
            value={applicationLink}
            onChange={(e) => setApplicationLink(e.target.value)}
            placeholder="https://…"
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
          {pending ? "Sending…" : "Invite loan officer"}
        </button>
      </form>

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
    </>
  );
}
