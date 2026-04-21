// =============================================================================
// Settings — authenticated admin-only server actions (Phase 2B).
// Branding, team member public profile, and default assignee for /apply.
// =============================================================================

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { organizations, teamMembers } from "@/db/schema";
import { getAuthContext } from "@/lib/supabase/auth";

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
  role: z.enum(["admin", "agent"]),
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

  try {
    const phone =
      parsed.data.phone === undefined || parsed.data.phone === ""
        ? null
        : parsed.data.phone;
    const bio =
      parsed.data.bio === undefined || parsed.data.bio === ""
        ? null
        : parsed.data.bio;

    const [updated] = await db
      .update(teamMembers)
      .set({
        displayName: parsed.data.displayName,
        phone,
        slug,
        bio,
        role: parsed.data.role,
      })
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
  return { ok: true };
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
