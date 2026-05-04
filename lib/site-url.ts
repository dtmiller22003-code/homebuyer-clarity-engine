// =============================================================================
// Public site origin for emails, Supabase invite redirectTo, and absolute links.
// Server or edge: prefers NEXT_PUBLIC_SITE_URL, then VERCEL_URL.
// =============================================================================

export function getPublicSiteOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const v = process.env.VERCEL_URL?.trim();
  if (v) {
    return v.startsWith("http") ? v.replace(/\/+$/, "") : `https://${v}`;
  }
  return null;
}
