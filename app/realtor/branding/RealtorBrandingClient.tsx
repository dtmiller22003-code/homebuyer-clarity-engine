"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateRealtorPartnerBranding } from "@/app/actions/realtors";

interface RealtorBrandingClientProps {
  partnerId: string;
  initial: {
    personalLogoUrl: string | null;
    subtitle: string | null;
    defaultApplicationLink: string | null;
  };
}

export function RealtorBrandingClient({
  partnerId,
  initial,
}: RealtorBrandingClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [personalLogoUrl, setPersonalLogoUrl] = useState(
    initial.personalLogoUrl ?? "",
  );
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [defaultApplicationLink, setDefaultApplicationLink] = useState(
    initial.defaultApplicationLink ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await updateRealtorPartnerBranding({
        partnerId,
        personalLogoUrl: personalLogoUrl.trim() || null,
        subtitle: subtitle.trim() || null,
        defaultApplicationLink:
          defaultApplicationLink.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Saved.");
      router.refresh();
    });
  };

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">
          Partner branding
        </h1>
        <p className="text-sm text-surface-600 mt-1">
          Optional logo and subtitle can appear on your public apply landing page
          when enabled. Paste HTTPS image URLs only — there is no file upload.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 border border-surface-200 rounded-lg p-4 bg-white"
      >
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Personal logo URL (https)
          </label>
          <input
            value={personalLogoUrl}
            onChange={(e) => setPersonalLogoUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Subtitle / brand line
          </label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder='e.g. In partnership with Cleared Home Lending'
            className="w-full rounded border border-surface-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Custom apply redirect (optional)
          </label>
          <input
            value={defaultApplicationLink}
            onChange={(e) => setDefaultApplicationLink(e.target.value)}
            placeholder="Leave blank to use company default"
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
          className="rounded-md bg-brand text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
