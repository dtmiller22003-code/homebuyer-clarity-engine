// =============================================================================
// PUBLIC server actions — no authentication required.
// Used by /apply/* pages to fetch branding and LO profiles.
//
// SECURITY NOTE: These read-only actions deliberately expose org-level branding
// and LO public profile data (name, email, phone, bio). All of this is
// intended to be shown on the public-facing intake form. Do not add sensitive
// fields to the return shapes.
// =============================================================================

"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, teamMembers } from "@/db/schema";

export interface PublicBrand {
  organizationId: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  fontPreset: "SYSTEM" | "SERIF" | "ROUNDED";
  companyEmail: string | null;
  companyPhone: string | null;
  defaultAssigneeId: string | null;
}

export interface PublicLoProfile {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  slug: string;
}

/** Set in env to the org UUID that owns public /apply (same row as /settings/branding). */
function publicOrganizationIdFromEnv(): string | null {
  const raw = process.env.PUBLIC_ORGANIZATION_ID?.trim();
  if (!raw) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  ) {
    return null;
  }
  return raw;
}

/**
 * The one organization that powers public intake + LO profiles for this deployment.
 * - Prefer PUBLIC_ORGANIZATION_ID (explicit, matches branding settings org).
 * - Else oldest row by created_at (deterministic; OK when only one org exists).
 */
async function getPublicOrganizationRow() {
  const explicitId = publicOrganizationIdFromEnv();
  if (explicitId) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, explicitId))
      .limit(1);
    return org ?? null;
  }
  const [org] = await db
    .select()
    .from(organizations)
    .orderBy(asc(organizations.createdAt))
    .limit(1);
  return org ?? null;
}

// -----------------------------------------------------------------------------
// getPublicBrand — org for public /apply branding (colors, logo, intake org id).
// Set PUBLIC_ORGANIZATION_ID to your admin org UUID so it matches /settings/branding.
// -----------------------------------------------------------------------------
export async function getPublicBrand(): Promise<PublicBrand | null> {
  const org = await getPublicOrganizationRow();
  if (!org) return null;

  return {
    organizationId: org.id,
    name: org.name,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    accentColor: org.accentColor,
    logoUrl: org.logoUrl,
    fontPreset: org.fontPreset,
    companyEmail: org.companyEmail,
    companyPhone: org.companyPhone,
    defaultAssigneeId: org.defaultAssigneeId,
  };
}

// -----------------------------------------------------------------------------
// getLoProfile — fetches an LO by slug (scoped to the single org).
// Returns null if not found — the page calls notFound() in that case.
// -----------------------------------------------------------------------------
export async function getLoProfile(
  slug: string,
): Promise<PublicLoProfile | null> {
  // Guard against empty/whitespace slugs
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const brand = await getPublicOrganizationRow();
  if (!brand) return null;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.organizationId, brand.id),
        eq(teamMembers.slug, normalized),
      ),
    )
    .limit(1);

  if (!member || !member.slug) return null;

  return {
    id: member.id,
    displayName: member.displayName,
    email: member.email,
    phone: member.phone,
    bio: member.bio,
    slug: member.slug,
  };
}
