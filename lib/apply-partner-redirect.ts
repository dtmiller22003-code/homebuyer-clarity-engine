// =============================================================================
// Public partner apply links — record visit, resolve external redirect URL.
// Used by /apply/realtor/[slug] and /apply/lo/[slug] (server components).
// =============================================================================

import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  partnerApplyRedirectEvents,
  realtorPartners,
  teamMembers,
} from "@/db/schema";
import {
  COMPANY_DEFAULT_APPLICATION_URL,
  resolveApplicationRedirectUrl,
} from "@/lib/default-application-url";
import { getPublicOrganizationRow } from "@/lib/public-organization";

export type RealtorApplyPartnerRow = {
  id: string;
  displayName: string;
  slug: string;
  personalLogoUrl: string | null;
  subtitle: string | null;
  defaultApplicationLink: string | null;
};

async function insertRedirectEvent(input: {
  organizationId: string;
  kind: "realtor" | "loan_officer";
  realtorPartnerId: string | null;
  teamMemberId: string | null;
  sourceSlug: string;
}) {
  try {
    await db.insert(partnerApplyRedirectEvents).values({
      organizationId: input.organizationId,
      kind: input.kind,
      realtorPartnerId: input.realtorPartnerId,
      teamMemberId: input.teamMemberId,
      sourceSlug: input.sourceSlug,
    });
  } catch (e) {
    console.error("[partnerApplyRedirectEvents] insert failed", e);
  }
}

export async function handleRealtorApplyLink(
  slugRaw: string,
): Promise<
  | { notFound: true }
  | { inactive: true; companyApplicationUrl: string }
  | { mode: "redirect"; url: string }
  | { mode: "branding"; externalUrl: string; partner: RealtorApplyPartnerRow }
> {
  const slug = slugRaw.trim().toLowerCase();
  if (!slug) return { notFound: true };

  const org = await getPublicOrganizationRow();
  if (!org) return { notFound: true };

  const [bySlug] = await db
    .select()
    .from(realtorPartners)
    .where(
      and(
        eq(realtorPartners.organizationId, org.id),
        eq(realtorPartners.slug, slug),
        isNull(realtorPartners.deletedAt),
      ),
    )
    .limit(1);

  if (!bySlug) return { notFound: true };

  if (!bySlug.isActive) {
    return {
      inactive: true,
      companyApplicationUrl: COMPANY_DEFAULT_APPLICATION_URL,
    };
  }

  const partner = bySlug;

  await insertRedirectEvent({
    organizationId: org.id,
    kind: "realtor",
    realtorPartnerId: partner.id,
    teamMemberId: null,
    sourceSlug: partner.slug,
  });

  const externalUrl = resolveApplicationRedirectUrl(
    partner.defaultApplicationLink,
  );

  const hasBranding =
    Boolean(partner.personalLogoUrl?.trim()) ||
    Boolean(partner.subtitle?.trim());

  const row: RealtorApplyPartnerRow = {
    id: partner.id,
    displayName: partner.displayName,
    slug: partner.slug,
    personalLogoUrl: partner.personalLogoUrl,
    subtitle: partner.subtitle,
    defaultApplicationLink: partner.defaultApplicationLink,
  };

  if (hasBranding) {
    return { mode: "branding", externalUrl, partner: row };
  }
  return { mode: "redirect", url: externalUrl };
}

export async function handleLoanOfficerApplyLink(
  slugRaw: string,
): Promise<{ notFound: true } | { url: string }> {
  const slug = slugRaw.trim().toLowerCase();
  if (!slug) return { notFound: true };

  const org = await getPublicOrganizationRow();
  if (!org) return { notFound: true };

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.organizationId, org.id),
        eq(teamMembers.slug, slug),
      ),
    )
    .limit(1);

  if (!member?.slug) return { notFound: true };

  const role = member.role.trim().toLowerCase();
  if (role !== "loan_officer" && role !== "agent") {
    return { notFound: true };
  }

  await insertRedirectEvent({
    organizationId: org.id,
    kind: "loan_officer",
    realtorPartnerId: null,
    teamMemberId: member.id,
    sourceSlug: member.slug,
  });

  const url = resolveApplicationRedirectUrl(member.applicationLink);

  return { url };
}
