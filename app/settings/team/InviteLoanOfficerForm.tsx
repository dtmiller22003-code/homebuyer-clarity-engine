"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { provisionLoanOfficer } from "@/app/actions/settings";
import { slugifyPublicProfile } from "@/lib/slugify";

export function InviteLoanOfficerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await provisionLoanOfficer({
        displayName,
        email,
        slug,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        applicationLink: applicationLink.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDisplayName("");
      setEmail("");
      setSlug("");
      setPhone("");
      setBio("");
      setApplicationLink("");
      setMessage(
        res.invitationSent
          ? "Loan officer saved. An invitation email was sent so they can sign in."
          : "Loan officer saved. They already had an account — no new invite email was sent.",
      );
      router.refresh();
    });
  };

  const slugPreview = slug.trim() ? slugifyPublicProfile(slug) : "";
  const previewLink =
    slugPreview && baseUrl
      ? `${baseUrl}/apply/lo/${encodeURIComponent(slugPreview)}`
      : null;

  return (
    <section className="rounded-lg border border-surface-200 bg-white p-5 mb-6">
      <h2 className="text-lg font-semibold text-surface-900">Invite loan officer</h2>
      <p className="text-sm text-surface-600 mt-1">
        Creates the Supabase Auth user (or links an existing one), adds them to
        your team with role <code className="text-xs bg-surface-100 px-1 rounded">loan_officer</code>, and sets their public apply link{" "}
        <code className="text-xs bg-surface-100 px-1 rounded">/apply/lo/your-slug</code>
        . No manual work in the Supabase dashboard is required.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 max-w-xl">
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Display name
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
            Email (sign-in / magic link)
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
            Public URL slug
          </label>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="e.g. jane-smith"
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
          {previewLink ? (
            <p className="mt-1 text-[11px] text-surface-500 break-all">
              Public lead link: {previewLink}
            </p>
          ) : null}
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
            Bio (optional)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Application link (optional, https)
          </label>
          <input
            value={applicationLink}
            onChange={(e) => setApplicationLink(e.target.value)}
            placeholder="Full mortgage application URL"
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-green-700">{message}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Invite loan officer"}
        </button>
      </form>
    </section>
  );
}
