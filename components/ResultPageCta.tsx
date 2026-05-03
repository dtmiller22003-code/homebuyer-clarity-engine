// =============================================================================
// Readiness-based CTA on the public result page. Advisory tone; no approval language.
// =============================================================================

export type ResultReadiness = "READY_NOW" | "NEARLY_READY" | "NOT_READY_YET";

export interface ResultPageCtaProps {
  readiness: ResultReadiness;
  phone?: string;
  bookingUrl?: string;
  formUrl?: string;
  /** Full mortgage application (LO-specific or company default). */
  applicationUrl: string;
}

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function ResultPageCta({
  readiness,
  phone,
  bookingUrl,
  formUrl,
  applicationUrl,
}: ResultPageCtaProps) {
  const telHref = phone ? `tel:${phoneDigits(phone)}` : undefined;
  const smsHref = phone ? `sms:${phoneDigits(phone)}` : undefined;

  if (readiness === "READY_NOW") {
    return (
      <div className="mt-8 rounded-lg border border-surface-200 bg-surface-50 p-4 sm:p-5">
        <p className="text-sm text-surface-700 leading-relaxed">
          When you are ready, a short conversation can help confirm next steps—no
          pressure, just clarity.
        </p>
        <a
          href={applicationUrl}
          className="mt-4 inline-flex rounded-md bg-[color:var(--brand-primary,#1e40af)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Continue to full application
        </a>
        {bookingUrl ? (
          <div className="mt-3">
            <a
              href={bookingUrl}
              className="text-sm text-[color:var(--brand-primary,#1e40af)] hover:underline"
            >
              Schedule a call
            </a>
          </div>
        ) : null}
        {telHref || smsHref ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {telHref ? (
              <a
                href={telHref}
                className="text-[color:var(--brand-primary,#1e40af)] hover:underline"
              >
                Call now
              </a>
            ) : null}
            {smsHref ? (
              <a
                href={smsHref}
                className="text-[color:var(--brand-primary,#1e40af)] hover:underline"
              >
                Text us
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (readiness === "NEARLY_READY") {
    return (
      <div className="mt-8 rounded-lg border border-surface-200 bg-surface-50 p-4 sm:p-5">
        <p className="text-sm text-surface-700 leading-relaxed">
          You are close. A quick chat can help prioritize what matters most for
          your timeline.
        </p>
        <a
          href={applicationUrl}
          className="mt-4 inline-flex rounded-md bg-[color:var(--brand-primary,#1e40af)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Continue to full application
        </a>
        {bookingUrl ? (
          <div className="mt-3">
            <a
              href={bookingUrl}
              className="text-sm text-[color:var(--brand-primary,#1e40af)] hover:underline"
            >
              Talk to a loan officer (schedule)
            </a>
          </div>
        ) : null}
        {formUrl ? (
          <div className="mt-3">
            <a
              href={formUrl}
              className="text-sm text-[color:var(--brand-primary,#1e40af)] hover:underline"
            >
              Send a quick question
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  // NOT_READY_YET
  return (
    <div className="mt-8 rounded-lg border border-surface-200 bg-surface-50 p-4 sm:p-5">
      <p className="text-sm text-surface-700 leading-relaxed">
        Many buyers start here. If you would like a simple checklist tailored to
        your snapshot, we can follow up when you are ready.
      </p>
      <a
        href={applicationUrl}
        className="mt-4 inline-flex rounded-md bg-[color:var(--brand-primary,#1e40af)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Continue to full application
      </a>
      {formUrl ? (
        <div className="mt-3">
          <a
            href={formUrl}
            className="text-sm text-[color:var(--brand-primary,#1e40af)] hover:underline"
          >
            Get a personalized checklist
          </a>
        </div>
      ) : null}
      {bookingUrl ? (
        <div className="mt-3">
          <a
            href={bookingUrl}
            className="text-sm text-[color:var(--brand-primary,#1e40af)] hover:underline"
          >
            Book for later
          </a>
        </div>
      ) : null}
    </div>
  );
}
