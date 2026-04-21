// =============================================================================
// Public result page CTA links — set via env (see names below). Optional URLs
// omitted or left as "#" fall back to phone-based actions in ResultPageCta.
// =============================================================================

function trimUrl(value: string | undefined): string | undefined {
  const t = value?.trim();
  if (!t || t === "#") return undefined;
  return t;
}

export interface ResultCtaConfig {
  phone: string;
  bookingUrl: string | undefined;
  formUrl: string | undefined;
}

/** Reads NEXT_PUBLIC_RESULT_CTA_* so values can be set in .env.local or deploy UI. */
export function getResultCtaConfig(): ResultCtaConfig {
  const phone =
    process.env.NEXT_PUBLIC_RESULT_CTA_PHONE?.trim() || "8326552996";

  return {
    phone,
    bookingUrl: trimUrl(process.env.NEXT_PUBLIC_RESULT_CTA_BOOKING_URL),
    formUrl: trimUrl(process.env.NEXT_PUBLIC_RESULT_CTA_FORM_URL),
  };
}
