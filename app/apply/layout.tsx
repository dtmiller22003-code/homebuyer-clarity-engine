// =============================================================================
// Public /apply layout (Phase 2B — Step 11).
// Branding tokens, font preset, minimal header, compliance footer.
// =============================================================================

import type { Metadata } from "next";
import { getApplyBranding } from "@/app/apply/getApplyBranding";

export const metadata: Metadata = {
  title: "Homebuying snapshot",
  description:
    "Educational assessment of your homebuying position — not a loan approval.",
};

function fontPresetClass(preset: "SYSTEM" | "SERIF" | "ROUNDED"): string {
  switch (preset) {
    case "SERIF":
      return "font-serif";
    case "ROUNDED":
      return "font-sans [font-family:ui-rounded,'Segoe_UI',system-ui,sans-serif]";
    default:
      return "font-sans";
  }
}

const DISCLAIMER =
  "This is an educational assessment, not a loan pre-approval or commitment to lend. Final loan decisions require a full application.";

export default async function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getApplyBranding();

  const fontClass = fontPresetClass(brand.fontPreset);

  return (
    <div
      className={`min-h-full flex flex-col text-surface-900 antialiased ${fontClass}`}
      style={
        {
          "--intake-brand": brand.primaryColor,
          "--brand-primary": brand.primaryColor,
          "--brand-secondary": brand.secondaryColor,
          "--brand-accent": brand.accentColor,
          "--brand-secondary-border": `${brand.secondaryColor}60`,
          "--brand-secondary-focus-ring": `${brand.secondaryColor}20`,
          "--brand-accent-bg-selected": `${brand.accentColor}15`,
          backgroundColor: `${brand.primaryColor}08`,
        } as React.CSSProperties
      }
    >
      <header className="shrink-0 border-b border-surface-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col">
          {brand.logoUrl ? (
            <div className="flex items-center">
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-20 sm:h-24 md:h-28 w-auto object-contain"
              />
            </div>
          ) : null}
          <div className="text-center mt-2">
            <h1 className="text-xl sm:text-2xl font-semibold">
              {brand.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">{children}</main>

      <footer className="shrink-0 border-t border-surface-200 bg-white px-4 py-4 sm:px-6">
        <p className="text-center text-xs sm:text-sm text-surface-600 max-w-3xl mx-auto leading-relaxed">
          <em>{DISCLAIMER}</em>
        </p>
      </footer>
    </div>
  );
}
