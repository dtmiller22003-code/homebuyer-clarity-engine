// =============================================================================
// Default external full-application URL (company-wide fallback).
// Override with DEFAULT_APPLICATION_URL in env for non-production values.
// =============================================================================

export const COMPANY_DEFAULT_APPLICATION_URL =
  process.env.DEFAULT_APPLICATION_URL?.trim() ||
  "https://2526205.my1003app.com/1844996/register?time=1739541068050";

/** Accepts https (and http for local dev only). Returns null if invalid. */
export function normalizeExternalApplicationUrl(
  raw: string | null | undefined,
): string | null {
  if (raw === undefined || raw === null) return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  try {
    const u = new URL(t);
    if (u.protocol === "https:") return t;
    if (u.protocol === "http:" && process.env.NODE_ENV === "development")
      return t;
    return null;
  } catch {
    return null;
  }
}

export function resolveApplicationRedirectUrl(
  custom: string | null | undefined,
): string {
  return normalizeExternalApplicationUrl(custom) ?? COMPANY_DEFAULT_APPLICATION_URL;
}
