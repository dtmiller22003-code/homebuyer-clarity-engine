// =============================================================================
// Resolved branding for public /apply routes — DB primary, fallback if missing.
// =============================================================================

import { cache } from "react";
import { getPublicBrand } from "@/app/actions/public";
import { APPLY_BRAND_FALLBACK } from "@/app/apply/mockBrand";

export type ApplyBranding = Omit<typeof APPLY_BRAND_FALLBACK, "fontPreset"> & {
  fontPreset: "SYSTEM" | "SERIF" | "ROUNDED";
};

export const getApplyBranding = cache(async function getApplyBranding(): Promise<ApplyBranding> {
  try {
    const row = await getPublicBrand();
    if (!row) {
      return { ...APPLY_BRAND_FALLBACK };
    }
    return {
      organizationId: row.organizationId,
      name: row.name.trim() ? row.name : APPLY_BRAND_FALLBACK.name,
      primaryColor: row.primaryColor || APPLY_BRAND_FALLBACK.primaryColor,
      secondaryColor: row.secondaryColor || APPLY_BRAND_FALLBACK.secondaryColor,
      accentColor: row.accentColor || APPLY_BRAND_FALLBACK.accentColor,
      logoUrl: row.logoUrl ?? null,
      fontPreset: row.fontPreset ?? APPLY_BRAND_FALLBACK.fontPreset,
    };
  } catch {
    return { ...APPLY_BRAND_FALLBACK };
  }
});
