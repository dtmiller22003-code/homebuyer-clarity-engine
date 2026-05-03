// =============================================================================
// Buyer-facing result page (Phase 2B — Step 15).
// Readiness-specific layout; no dollar amounts or approval language in copy.
// =============================================================================

import { notFound } from "next/navigation";
import type { PublicResult } from "@/app/actions/intake";
import { getPublicResult } from "@/app/actions/intake";
import { ResultPageCta } from "@/components/ResultPageCta";
import { getResultCtaConfig } from "@/lib/resultCtaConfig";
import type { PillarScore } from "@/lib/types";

const DISCLAIMER = (
  <>
    <em>
      This is an educational assessment, not a loan pre-approval or commitment
      to lend. Final loan decisions require a full application.
    </em>
  </>
);

function scoreBadgeClass(score: PillarScore): string {
  switch (score) {
    case "strong":
      return "bg-strong-bg text-strong-text border border-strong-border";
    case "moderate":
      return "bg-moderate-bg text-moderate-text border border-moderate-border";
    default:
      return "bg-weak-bg text-weak-text border border-weak-border";
  }
}

function scoreLabel(score: PillarScore): string {
  switch (score) {
    case "strong":
      return "Strong";
    case "moderate":
      return "Moderate";
    default:
      return "Room to grow";
  }
}

function PillarList({ result }: { result: PublicResult }) {
  const items = [
    { key: "Credit", pillar: result.pillarSummaries.credit },
    { key: "Income vs. debt", pillar: result.pillarSummaries.income },
    { key: "Cash to close", pillar: result.pillarSummaries.cash },
  ] as const;

  return (
    <ul className="mt-4 space-y-3">
      {items.map(({ key, pillar }) => (
        <li
          key={key}
          className="flex flex-col sm:flex-row sm:items-start sm:gap-3 gap-1"
        >
          <span
            className={`inline-flex shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${scoreBadgeClass(pillar.score)}`}
          >
            {key}: {scoreLabel(pillar.score)}
          </span>
          <span className="text-sm text-surface-700 leading-snug">
            {pillar.headline}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ContactCard({
  contact,
  compact,
}: {
  contact: PublicResult["contact"];
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-surface-200 bg-white shadow-sm ${compact ? "p-4" : "p-5"}`}
    >
      <h3
        className={`font-semibold text-surface-900 ${compact ? "text-sm" : "text-base"}`}
      >
        {contact.displayName}
      </h3>
      {contact.email ? (
        <a
          href={`mailto:${contact.email}`}
          className="mt-2 block text-sm text-[color:var(--brand-primary,#1e40af)] hover:underline break-all"
        >
          {contact.email}
        </a>
      ) : null}
      {contact.phone ? (
        <a
          href={`tel:${contact.phone.replace(/\s/g, "")}`}
          className="mt-1 block text-sm text-[color:var(--brand-primary,#1e40af)] hover:underline"
        >
          {contact.phone}
        </a>
      ) : null}
    </div>
  );
}

function RecommendationCard({
  rec,
}: {
  rec: NonNullable<PublicResult["topRecommendation"]>;
}) {
  return (
    <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-surface-600">
        Focus area
      </h3>
      <p className="mt-2 text-base font-semibold text-surface-900">{rec.title}</p>
      <p className="mt-2 text-sm text-surface-700 leading-relaxed">
        {rec.description}
      </p>
    </div>
  );
}

export default async function PublicResultPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getPublicResult(params.id);
  if (!result) {
    notFound();
  }

  const cta = getResultCtaConfig();

  const { readiness, firstName } = result;

  const shell =
    readiness === "READY_NOW"
      ? {
          accent: "border-l-4 border-emerald-500 pl-4 sm:pl-5",
          heading: "You're in a strong position",
          sub: "Across the three areas we look at for buying a home, you are in a strong overall position.",
          leadIn:
            "When you are ready to talk through next steps, we are here to help.",
        }
      : readiness === "NEARLY_READY"
        ? {
            accent: "border-l-4 border-amber-500 pl-4 sm:pl-5",
            heading: "You're almost there",
            sub: "You are close on one or more areas. A few focused steps could put you in an even stronger position.",
            leadIn:
              "When you are ready, we are here to walk through what would help most.",
          }
        : {
            accent: "border-l-4 border-surface-300 pl-4 sm:pl-5",
            heading: "Here's where you stand",
            sub: "Here is a simple read on the three areas buyers often focus on first.",
            leadIn:
              "This snapshot highlights areas that may benefit from attention—that is guidance, not a stopping point. Many buyers use it to pick what to focus on next; your loan officer can help map practical steps when you are ready.",
          };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <article className={shell.accent}>
        <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900 tracking-tight">
          {shell.heading}, {firstName}
        </h1>
        <p className="mt-2 text-sm text-surface-600 leading-relaxed">{shell.sub}</p>

        <PillarList result={result} />

        <p className="mt-6 text-sm sm:text-base text-surface-800 leading-relaxed">
          {result.buyerExplanation}
        </p>

        {readiness === "NEARLY_READY" && result.topRecommendation ? (
          <div className="mt-8">
            <RecommendationCard rec={result.topRecommendation} />
          </div>
        ) : null}

        {readiness === "NOT_READY_YET" && result.topRecommendation ? (
          <div className="mt-8">
            <p className="text-sm font-medium text-surface-800 mb-2">
              A high-impact place to start
            </p>
            <RecommendationCard rec={result.topRecommendation} />
          </div>
        ) : null}

        {readiness === "READY_NOW" ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-surface-900">
              Let&apos;s schedule a conversation
            </h2>
            <p className="mt-1 text-sm text-surface-600">{shell.leadIn}</p>
          </div>
        ) : readiness === "NEARLY_READY" ? (
          <div className="mt-8">
            <p className="text-sm text-surface-700">{shell.leadIn}</p>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-sm text-surface-700">{shell.leadIn}</p>
          </div>
        )}

        <ResultPageCta
          readiness={readiness}
          phone={cta.phone}
          bookingUrl={cta.bookingUrl}
          formUrl={cta.formUrl}
          applicationUrl={result.primaryApplicationUrl}
        />

        <div className="mt-6 text-xs sm:text-sm text-surface-600 leading-relaxed">
          {DISCLAIMER}
        </div>

        <div className={readiness === "NOT_READY_YET" ? "mt-6" : "mt-4"}>
          {readiness === "NOT_READY_YET" ? (
            <>
              <h2 className="text-sm font-semibold text-surface-800">
                Questions about your next steps?
              </h2>
              <p className="mt-1 text-xs text-surface-600 mb-3">Reach out any time.</p>
              <ContactCard contact={result.contact} compact />
            </>
          ) : (
            <ContactCard contact={result.contact} />
          )}
        </div>
      </article>
    </div>
  );
}
