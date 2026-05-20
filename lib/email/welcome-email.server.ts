// =============================================================================
// Optional transactional welcome emails after realtor / LO provisioning.
// Server-only. Never import from client components.
//
// Wiring:
// - Set RESEND_API_KEY + RESEND_WELCOME_FROM (verified sender in Resend) to send.
// - If unset, sends are skipped and a TODO is logged (account creation still succeeds).
// =============================================================================

import "server-only";

import { getPublicSiteOrigin } from "@/lib/site-url";

const BRAND = "Cleared Home Lending";
const TAGLINE = "Clear Answers. Confident Moves.";

/**
 * Resend REST API (https://resend.com). Add other providers here if needed.
 *
 * TODO: Add SENDGRID_API_KEY / etc. branches when your org standardizes on another vendor.
 */
async function sendTransactionalEmail(
  to: string,
  subject: string,
  textBody: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_WELCOME_FROM?.trim();
  if (!apiKey || !from) {
    console.warn(
      "[welcome-email] RESEND_API_KEY and RESEND_WELCOME_FROM are not set; welcome email skipped. " +
        "Configure Resend (or extend this module) to send post-provisioning messages.",
    );
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: textBody,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${detail || res.statusText}`);
  }

  return true;
}

function buildRealtorWelcomeBody(input: {
  name: string;
  publicLeadLink: string;
  privateDashboardUrl: string;
}): string {
  return `Hi ${input.name},

Your partner access has been created.

Your public lead link:
${input.publicLeadLink}

Your private dashboard:
${input.privateDashboardUrl}

Use your public lead link with buyers so each lead is tracked to your name. Your private dashboard lets you view only the leads assigned to you.

${BRAND}
`;
}

function buildLoanOfficerWelcomeBody(input: {
  name: string;
  publicLeadLink: string;
  applicationLink: string;
}): string {
  return `Hi ${input.name},

Your loan officer access has been created.

Your public lead link:
${input.publicLeadLink}

Your application link:
${input.applicationLink}

Use your public lead link to track lead source attribution.

${BRAND}
`;
}

/** Fire-and-forget safe: logs errors, never throws to callers. */
export async function sendRealtorPartnerWelcomeEmail(input: {
  to: string;
  displayName: string;
  partnerSlug: string;
}): Promise<void> {
  const origin = getPublicSiteOrigin();
  if (!origin) {
    console.warn(
      "[welcome-email] realtor: NEXT_PUBLIC_SITE_URL (or VERCEL_URL) not set; skipping welcome email.",
    );
    return;
  }

  const publicLeadLink = `${origin}/apply/realtor/${encodeURIComponent(input.partnerSlug)}`;
  const privateDashboardUrl = `${origin}/realtor`;
  const subject = `Welcome to your ${BRAND} Partner Dashboard`;
  const text = buildRealtorWelcomeBody({
    name: input.displayName.trim(),
    publicLeadLink,
    privateDashboardUrl,
  });

  try {
    await sendTransactionalEmail(input.to.trim(), subject, text);
  } catch (err) {
    console.error("[welcome-email] realtor partner send failed:", err);
  }
}

export async function sendLoanOfficerWelcomeEmail(input: {
  to: string;
  displayName: string;
  loSlug: string;
  /** Resolved external application URL (custom LO link or company default). */
  applicationLink: string;
}): Promise<void> {
  const origin = getPublicSiteOrigin();
  if (!origin) {
    console.warn(
      "[welcome-email] loan officer: NEXT_PUBLIC_SITE_URL (or VERCEL_URL) not set; skipping welcome email.",
    );
    return;
  }

  const publicLeadLink = `${origin}/apply/lo/${encodeURIComponent(input.loSlug)}`;
  const subject = `Welcome to ${BRAND}`;
  const text = buildLoanOfficerWelcomeBody({
    name: input.displayName.trim(),
    publicLeadLink,
    applicationLink: input.applicationLink,
  });

  try {
    await sendTransactionalEmail(input.to.trim(), subject, text);
  } catch (err) {
    console.error("[welcome-email] loan officer send failed:", err);
  }
}
