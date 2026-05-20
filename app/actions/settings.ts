// =============================================================================
// Settings — authenticated admin-only server actions (Phase 2B).
// Branding, team member public profile, and default assignee for /apply.
// =============================================================================

"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import {
  normalizeExternalApplicationUrl,
  resolveApplicationRedirectUrl,
} from "@/lib/default-application-url";
import { slugifyPublicProfile } from "@/lib/slugify";
import { organizations, teamMembers } from "@/db/schema";
import { getAuthContext } from "@/lib/supabase/auth";
import { sendLoanOfficerWelcomeEmail } from "@/lib/email/welcome-email.server";
import { ensureAuthUserForEmail } from "@/lib/supabase/provision-auth-user";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a #RRGGBB hex value");

const optionalEmail = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.union([z.null(), z.string().email()]),
);

const optionalPhone = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.union([z.null(), z.string().max(40)]),
);

const updateBrandingSchema = z.object({
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  logoUrl: z.string().nullable(),
  fontPreset: z.enum(["SYSTEM", "SERIF", "ROUNDED"]),
  companyEmail: optionalEmail.optional(),
  companyPhone: optionalPhone.optional(),
  companyName: z.string().min(1).max(200),
});

function normalizeLogoUrl(value: string | null): string | null {
  if (value === null) return null;
  const t = value.trim();
  if (t.length === 0) return null;
  return t;
}

function validateHttpsLogo(url: string | null): string | null {
  if (url === null) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return "Logo URL must start with https://";
    }
    return null;
  } catch {
    return "Logo URL is not valid";
  }
}

const updateTeamMemberSchema = z.object({
  memberId: z.string().uuid(),
  displayName: z.string().min(1).max(120),
  phone: z.string().max(40).nullable().optional(),
  slug: z.string().nullable().optional(),
  bio: z.string().max(4000).nullable().optional(),
  role: z.enum(["admin", "agent", "loan_officer"]),
  applicationLink: z.union([z.string().max(2000), z.null()]).optional(),
});

function normalizeSlug(raw: string | null | undefined): string | null {
  if (raw === undefined || raw === null) return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  return t;
}

function slugValidationError(slug: string | null): string | null {
  if (slug === null) return null;
  if (slug.length < 2 || slug.length > 30) {
    return "Slug must be between 2 and 30 characters, or empty to disable the public link.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Slug must be lowercase letters, numbers, and hyphens only (no leading or trailing hyphen).";
  }
  return null;
}

const provisionLoanOfficerSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  slug: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(4000).optional(),
  applicationLink: z.string().trim().max(2000).optional(),
});

const setDefaultAssigneeSchema = z.object({
  memberId: z.string().uuid(),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first
    ? `${first.path.join(".")}: ${first.message}`
    : "Validation failed";
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

// -----------------------------------------------------------------------------
// updateBranding
// -----------------------------------------------------------------------------
export async function updateBranding(
  input: z.infer<typeof updateBrandingSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }

  const parsed = updateBrandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const logoUrl = normalizeLogoUrl(parsed.data.logoUrl);
  const logoErr = validateHttpsLogo(logoUrl);
  if (logoErr) {
    return { ok: false, error: logoErr };
  }

  const [updated] = await db
    .update(organizations)
    .set({
      name: parsed.data.companyName,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
      accentColor: parsed.data.accentColor,
      logoUrl,
      fontPreset: parsed.data.fontPreset,
      companyEmail: parsed.data.companyEmail ?? null,
      companyPhone: parsed.data.companyPhone ?? null,
    })
    .where(eq(organizations.id, auth.organizationId))
    .returning();

  if (!updated) {
    return { ok: false, error: "Organization not found." };
  }

  revalidatePath("/settings/branding");
  revalidatePath("/settings/team");
  revalidatePath("/apply");
  return { ok: true };
}

// -----------------------------------------------------------------------------
// updateTeamMember
// -----------------------------------------------------------------------------
export async function updateTeamMember(
  input: z.infer<typeof updateTeamMemberSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }

  const parsed = updateTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const slug = normalizeSlug(parsed.data.slug);
  const slugErr = slugValidationError(slug);
  if (slugErr) {
    return { ok: false, error: slugErr };
  }

  let applicationLinkResolved: string | null | undefined = undefined;
  if (parsed.data.applicationLink !== undefined) {
    const raw = parsed.data.applicationLink;
    if (raw === null || raw === "") {
      applicationLinkResolved = null;
    } else {
      const normalized = normalizeExternalApplicationUrl(raw.trim());
      if (!normalized) {
        return {
          ok: false,
          error:
            "Application link must be a valid https URL (or leave blank for the company default).",
        };
      }
      applicationLinkResolved = normalized;
    }
  }

  try {
    const phone =
      parsed.data.phone === undefined || parsed.data.phone === ""
        ? null
        : parsed.data.phone;
    const bio =
      parsed.data.bio === undefined || parsed.data.bio === ""
        ? null
        : parsed.data.bio;

    const updatePayload: {
      displayName: string;
      phone: string | null;
      slug: string | null;
      bio: string | null;
      role: string;
      applicationLink?: string | null;
    } = {
      displayName: parsed.data.displayName,
      phone,
      slug,
      bio,
      role: parsed.data.role,
    };
    if (applicationLinkResolved !== undefined) {
      updatePayload.applicationLink = applicationLinkResolved;
    }

    const [updated] = await db
      .update(teamMembers)
      .set(updatePayload)
      .where(
        and(
          eq(teamMembers.id, parsed.data.memberId),
          eq(teamMembers.organizationId, auth.organizationId),
        ),
      )
      .returning();

    if (!updated) {
      return { ok: false, error: "Team member not found or access denied." };
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        error:
          "That slug is already used by another team member in your organization.",
      };
    }
    throw err;
  }

  revalidatePath("/settings/branding");
  revalidatePath("/settings/team");
  revalidatePath("/apply");
  revalidatePath("/apply/lo");
  return { ok: true };
}

// -----------------------------------------------------------------------------
// provisionLoanOfficer — admin: Auth invite + team_members (loan_officer)
// -----------------------------------------------------------------------------
export async function provisionLoanOfficer(
  input: z.infer<typeof provisionLoanOfficerSchema>,
): Promise<
  { ok: true; invitationSent: boolean } | { ok: false; error: string }
> {
  const authCtx = await getAuthContext();
  if (authCtx.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }

  const parsed = provisionLoanOfficerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const slug = slugifyPublicProfile(parsed.data.slug);
  const slugErr = slugValidationError(slug);
  if (slugErr) {
    return { ok: false, error: slugErr };
  }

  const provisioned = await ensureAuthUserForEmail({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
  });
  if (!provisioned.ok) {
    return provisioned;
  }

  const emailLower = parsed.data.email.trim().toLowerCase();
  const [emailDup] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.organizationId, authCtx.organizationId),
        sql`lower(${teamMembers.email}) = ${emailLower}`,
      ),
    )
    .limit(1);

  if (emailDup && emailDup.userId !== provisioned.userId) {
    return {
      ok: false,
      error:
        "This email is already assigned to another team member in your organization.",
    };
  }

  const [existingTm] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, provisioned.userId))
    .limit(1);

  if (
    existingTm &&
    existingTm.organizationId !== authCtx.organizationId
  ) {
    return {
      ok: false,
      error:
        "This email is already linked to another organization. Use a different email or remove the other membership first.",
    };
  }

  if (
    existingTm &&
    existingTm.organizationId === authCtx.organizationId &&
    existingTm.role === "admin"
  ) {
    return {
      ok: false,
      error:
        "This email is already assigned to an admin in your organization. Use a different email for a loan officer.",
    };
  }

  if (
    existingTm &&
    existingTm.organizationId === authCtx.organizationId &&
    existingTm.role === "realtor_partner"
  ) {
    return {
      ok: false,
      error:
        "This email belongs to a realtor partner. Use a different email for a loan officer, or remove the partner first.",
    };
  }

  const [slugOwner] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.organizationId, authCtx.organizationId),
        eq(teamMembers.slug, slug),
      ),
    )
    .limit(1);

  if (slugOwner && slugOwner.userId !== provisioned.userId) {
    return {
      ok: false,
      error:
        "That slug is already used by another team member in your organization.",
    };
  }

  let applicationLink: string | null = null;
  if (parsed.data.applicationLink?.trim()) {
    const normalized = normalizeExternalApplicationUrl(
      parsed.data.applicationLink.trim(),
    );
    if (!normalized) {
      return {
        ok: false,
        error:
          "Application link must be a valid https URL, or leave it blank to use the company default.",
      };
    }
    applicationLink = normalized;
  }

  const phone =
    parsed.data.phone === undefined || parsed.data.phone.trim() === ""
      ? null
      : parsed.data.phone.trim();
  const bio =
    parsed.data.bio === undefined || parsed.data.bio.trim() === ""
      ? null
      : parsed.data.bio.trim();

  try {
    await db
      .insert(teamMembers)
      .values({
        userId: provisioned.userId,
        organizationId: authCtx.organizationId,
        displayName: parsed.data.displayName.trim(),
        email: parsed.data.email.trim(),
        role: "loan_officer",
        slug,
        phone,
        bio,
        applicationLink,
        realtorPartnerId: null,
      })
      .onConflictDoUpdate({
        target: teamMembers.userId,
        set: {
          organizationId: authCtx.organizationId,
          displayName: parsed.data.displayName.trim(),
          email: parsed.data.email.trim(),
          role: "loan_officer",
          slug,
          phone,
          bio,
          applicationLink,
          realtorPartnerId: null,
        },
      });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        error:
          "Could not save this team member (duplicate slug or conflict). Try a different slug.",
      };
    }
    throw err;
  }

  revalidatePath("/settings/team");
  revalidatePath("/apply");
  revalidatePath("/apply/lo");

  const resolvedApplicationUrl =
    resolveApplicationRedirectUrl(applicationLink);
  void sendLoanOfficerWelcomeEmail({
    to: parsed.data.email.trim(),
    displayName: parsed.data.displayName.trim(),
    loSlug: slug,
    applicationLink: resolvedApplicationUrl,
  });

  return { ok: true, invitationSent: provisioned.invitationSent };
}

// -----------------------------------------------------------------------------
// setDefaultAssignee
// -----------------------------------------------------------------------------
export async function setDefaultAssignee(
  memberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }

  const parsed = setDefaultAssigneeSchema.safeParse({ memberId });
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.id, parsed.data.memberId),
        eq(teamMembers.organizationId, auth.organizationId),
      ),
    )
    .limit(1);

  if (!member) {
    return { ok: false, error: "Team member not found or access denied." };
  }

  const [updated] = await db
    .update(organizations)
    .set({ defaultAssigneeId: parsed.data.memberId })
    .where(eq(organizations.id, auth.organizationId))
    .returning();

  if (!updated) {
    return { ok: false, error: "Organization not found." };
  }

  revalidatePath("/settings/branding");
  revalidatePath("/settings/team");
  revalidatePath("/apply");
  return { ok: true };
}
