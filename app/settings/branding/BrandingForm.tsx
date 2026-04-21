"use client";

import { useMemo, useState, useTransition } from "react";
import { updateBranding } from "@/app/actions/settings";

type FontPreset = "SYSTEM" | "SERIF" | "ROUNDED";

export interface BrandingFormProps {
  initial: {
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string | null;
    fontPreset: FontPreset;
    companyEmail: string | null;
    companyPhone: string | null;
  };
}

export function BrandingForm({ initial }: BrandingFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState(initial.companyName);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initial.secondaryColor);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [fontPreset, setFontPreset] = useState<FontPreset>(initial.fontPreset);
  const [companyEmail, setCompanyEmail] = useState(initial.companyEmail ?? "");
  const [companyPhone, setCompanyPhone] = useState(initial.companyPhone ?? "");

  const previewFontClass = useMemo(() => {
    if (fontPreset === "SERIF") return "font-serif";
    if (fontPreset === "ROUNDED") {
      return "font-sans [font-family:ui-rounded,'Segoe_UI',system-ui,sans-serif]";
    }
    return "font-sans";
  }, [fontPreset]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const res = await updateBranding({
        companyName,
        primaryColor,
        secondaryColor,
        accentColor,
        logoUrl: logoUrl.trim() || null,
        fontPreset,
        companyEmail: companyEmail.trim() || null,
        companyPhone: companyPhone.trim() || null,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Branding saved.");
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-surface-200 bg-white p-5 space-y-4"
      >
        <h2 className="text-lg font-semibold text-surface-900">Brand settings</h2>

        <label className="block">
          <span className="text-sm font-medium text-surface-800">Company name</span>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-1 w-full rounded-md border border-surface-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Primary</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="mt-1 h-10 w-full rounded border border-surface-300 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Secondary</span>
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="mt-1 h-10 w-full rounded border border-surface-300 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Accent</span>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="mt-1 h-10 w-full rounded border border-surface-300 bg-white"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-surface-800">Logo URL</span>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-surface-300 px-3 py-2 text-sm"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-surface-800">Font preset</legend>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(["SYSTEM", "SERIF", "ROUNDED"] as const).map((preset) => (
              <label
                key={preset}
                className="rounded-md border border-surface-300 px-3 py-2 text-sm flex items-center gap-2"
              >
                <input
                  type="radio"
                  checked={fontPreset === preset}
                  onChange={() => setFontPreset(preset)}
                />
                {preset}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium text-surface-800">Company email</span>
          <input
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-surface-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-surface-800">Company phone</span>
          <input
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-surface-300 px-3 py-2 text-sm"
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save branding"}
        </button>
      </form>

      <section className="rounded-lg border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-surface-900">Preview</h2>
        <div
          className={`mt-4 rounded-lg border border-surface-200 overflow-hidden ${previewFontClass}`}
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="px-4 py-3 border-b border-surface-200 flex items-center gap-3">
            <div
              className="h-8 w-8 rounded"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="text-sm font-semibold">{companyName || "Company Name"}</div>
          </div>
          <div className="p-4 space-y-2 text-sm text-surface-700">
            <p style={{ color: secondaryColor }}>How would you like to check your position?</p>
            <div
              className="rounded-md border p-3"
              style={{ borderColor: primaryColor }}
            >
              Quick check (2 minutes)
            </div>
            <div
              className="rounded-md border p-3"
              style={{ borderColor: accentColor }}
            >
              Detailed snapshot (5 minutes)
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
