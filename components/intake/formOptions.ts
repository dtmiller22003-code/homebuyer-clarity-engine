// =============================================================================
// Buyer-facing labels for public intake selects (Phase 2B).
// Values match `IntakeInput` / server enums — labels stay plain-English.
// =============================================================================

export const BUYER_CREDIT_OPTIONS = [
  { value: "740_PLUS", label: "Excellent (740+)" },
  { value: "680_739", label: "Very good (680–739)" },
  { value: "620_679", label: "Good (620–679)" },
  { value: "580_619", label: "Fair (580–619)" },
  { value: "BELOW_580", label: "Below 580 / not sure" },
] as const;

export const BUYER_INCOME_OPTIONS = [
  { value: "UNDER_40K", label: "Under $40,000" },
  { value: "40K_60K", label: "$40,000 – $60,000" },
  { value: "60K_90K", label: "$60,000 – $90,000" },
  { value: "90K_150K", label: "$90,000 – $150,000" },
  { value: "150K_PLUS", label: "$150,000+" },
] as const;

export const BUYER_CASH_OPTIONS = [
  { value: "UNDER_5K", label: "Under $5,000" },
  { value: "5K_15K", label: "$5,000 – $15,000" },
  { value: "15K_30K", label: "$15,000 – $30,000" },
  { value: "30K_60K", label: "$30,000 – $60,000" },
  { value: "60K_PLUS", label: "$60,000+" },
] as const;

/** Simplified employment choice in the UI before mapping to server enums. */
export const BUYER_EMPLOYMENT_UI_OPTIONS = [
  { value: "W2", label: "W-2 employee" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "MIXED", label: "Mix of both" },
  { value: "RETIRED", label: "Retired" },
] as const;

export type BuyerEmploymentUiValue =
  (typeof BUYER_EMPLOYMENT_UI_OPTIONS)[number]["value"];

export const BUYER_LEAD_SOURCES = [
  { value: "WEBSITE_FORM", label: "Website" },
  { value: "REFERRAL_AGENT", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social" },
  { value: "OTHER", label: "Other" },
] as const;

/** Shown on long form only — not persisted in Phase 2B (analytics-style UX). */
export const BUYER_TIMELINE_OPTIONS = [
  { value: "0-3", label: "In the next 0–3 months" },
  { value: "3-6", label: "In 3–6 months" },
  { value: "6-12", label: "In 6–12 months" },
  { value: "exploring", label: "Just exploring" },
] as const;

/** Passed from server after `getPublicBrand()` — drives focus ring / accents. */
export interface IntakeBrandColors {
  primary: string;
  secondary: string;
  accent: string;
}
