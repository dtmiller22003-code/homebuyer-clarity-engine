/**
 * Fallback branding when no organization exists in the DB or reads fail.
 * Keeps /apply usable for local/dev without blocking the intake flow.
 */
export const APPLY_BRAND_FALLBACK = {
  organizationId: "be1d1887-60e3-4681-836a-e03ffd43681b",
  name: "Cleared Home Lending",
  primaryColor: "#1e40af",
  secondaryColor: "#64748b",
  accentColor: "#f59e0b",
  logoUrl: null as string | null,
  fontPreset: "SYSTEM" as const,
};
