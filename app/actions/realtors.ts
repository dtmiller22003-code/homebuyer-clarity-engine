"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { leads, realtorPartners, teamMembers } from "@/db/schema";
import { normalizeExternalApplicationUrl } from "@/lib/default-application-url";
import { isAdminRole, isRealtorPartnerRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";
import { slugifyPublicProfile } from "@/lib/slugify";
import { sendRealtorPartnerWelcomeEmail } from "@/lib/email/welcome-email.server";
import { ensureAuthUserForEmail } from "@/lib/supabase/provision-auth-user";
import { getRealtorPartnerPerformanceAdmin } from "@/app/actions/realtor-performance";

function slugify(raw: string): string {
  return slugifyPublicProfile(raw);
}

const createPartnerSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  slug: z.string().trim().max(80).optional(),
  brokerage: z.string().trim().max(120).optional(),
});

export type RealtorPartnerAdminRow = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  slug: string;
  brokerage: string | null;
  leadCount: number;
  /** DB `is_active` — false when deactivated or soft-deleted. */
  isActive: boolean;
  /** When set, partner was removed (soft delete); row kept for reporting. */
  deletedAt: string | null;
  personalLogoUrl: string | null;
  subtitle: string | null;
  defaultApplicationLink: string | null;
  /** Synthetic performance row for leads with no `realtor_partner_id`. */
  rowKind?: "partner" | "historical";
};

/** Fills `source_display_name` when missing so reporting survives FK changes. */
async function backfillRealtorSourceDisplayOnLeads(
  organizationId: string,
  partnerId: string,
  displayName: string,
): Promise<void> {
  await db
    .update(leads)
    .set({
      sourceDisplayName: sql`coalesce(${leads.sourceDisplayName}, ${displayName})`,
    })
    .where(
      and(
        eq(leads.organizationId, organizationId),
        eq(leads.realtorPartnerId, partnerId),
        eq(leads.sourceType, "realtor"),
      ),
    );
}

export async function listRealtorPartnersAdmin(): Promise<
  RealtorPartnerAdminRow[]
> {
  const { rows } = await getRealtorPartnerPerformanceAdmin();
  return rows
    .filter((r) => r.rowKind !== "historical")
    .map(
      ({
        leadsLast30Days: _a,
        leadsThisMonth: _b,
        leadsThisWeek: _c,
        convertedCount: _d,
        conversionRatePercent: _e,
        lastLeadAt: _f,
        rowKind: _rk,
        ...base
      }) => base,
    );
}

export async function createRealtorPartner(
  input: z.infer<typeof createPartnerSchema>,
): Promise<
  | { ok: true; id: string; slug: string; invitationSent: boolean }
  | { ok: false; error: string }
> {
  const authCtx = await getAuthContext();
  if (!isAdminRole(authCtx.role)) {
    return { ok: false, error: "Only administrators can add realtor partners." };
  }

  const parsed = createPartnerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form fields and try again." };
  }

  const slug = parsed.data.slug?.length
    ? slugify(parsed.data.slug)
    : slugify(parsed.data.displayName);

  if (!slug) {
    return { ok: false, error: "Could not build a URL slug from that name." };
  }

  const dup = await db
    .select({ id: realtorPartners.id })
    .from(realtorPartners)
    .where(
      and(
        eq(realtorPartners.organizationId, authCtx.organizationId),
        eq(realtorPartners.slug, slug),
        isNull(realtorPartners.deletedAt),
      ),
    )
    .limit(1);

  if (dup.length > 0) {
    return {
      ok: false,
      error: "That slug is already in use. Choose a different slug or name.",
    };
  }

  const provisioned = await ensureAuthUserForEmail({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
  });
  if (!provisioned.ok) {
    return { ok: false, error: provisioned.error };
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

  if (existingTm && existingTm.organizationId === authCtx.organizationId) {
    const r = existingTm.role.trim().toLowerCase();
    if (r === "admin" || r === "loan_officer" || r === "agent") {
      return {
        ok: false,
        error:
          "This email is already used by an internal team account. Use a different email for the realtor partner.",
      };
    }
  }

  let partnerId: string | undefined;
  try {
    const [row] = await db
      .insert(realtorPartners)
      .values({
        organizationId: authCtx.organizationId,
        displayName: parsed.data.displayName,
        email: parsed.data.email.trim(),
        phone: parsed.data.phone || null,
        slug,
        brokerage: parsed.data.brokerage || null,
      })
      .returning({ id: realtorPartners.id, slug: realtorPartners.slug });

    if (!row) {
      return { ok: false, error: "Could not create partner." };
    }
    partnerId = row.id;

    await db
      .insert(teamMembers)
      .values({
        userId: provisioned.userId,
        organizationId: authCtx.organizationId,
        displayName: parsed.data.displayName,
        email: parsed.data.email.trim(),
        role: "realtor_partner",
        realtorPartnerId: row.id,
        phone: parsed.data.phone || null,
        slug: null,
        bio: null,
        applicationLink: null,
      })
      .onConflictDoUpdate({
        target: teamMembers.userId,
        set: {
          organizationId: authCtx.organizationId,
          displayName: parsed.data.displayName,
          email: parsed.data.email.trim(),
          role: "realtor_partner",
          realtorPartnerId: row.id,
          phone: parsed.data.phone || null,
        },
      });

    revalidatePath("/settings/realtors");
    revalidatePath("/settings/team");
    revalidatePath("/realtor");

    void sendRealtorPartnerWelcomeEmail({
      to: parsed.data.email.trim(),
      displayName: parsed.data.displayName,
      partnerSlug: row.slug,
    });

    return {
      ok: true,
      id: row.id,
      slug: row.slug,
      invitationSent: provisioned.invitationSent,
    };
  } catch (e) {
    if (partnerId) {
      await db.delete(realtorPartners).where(eq(realtorPartners.id, partnerId));
    }
    if (isUniqueViolation(e)) {
      return {
        ok: false,
        error:
          "Could not save team member (duplicate slug or email conflict). Try a different slug.",
      };
    }
    return { ok: false, error: "Could not create partner. Try again." };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

const deleteRealtorPermanentSchema = z.object({
  partnerId: z.string().uuid(),
  confirmation: z.literal("DELETE"),
});

export async function deactivateRealtorPartner(
  partnerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authCtx = await getAuthContext();
  if (!isAdminRole(authCtx.role)) {
    return { ok: false, error: "Only administrators can deactivate partners." };
  }
  if (!z.string().uuid().safeParse(partnerId).success) {
    return { ok: false, error: "Invalid partner id." };
  }

  const [partner] = await db
    .select({
      id: realtorPartners.id,
      displayName: realtorPartners.displayName,
    })
    .from(realtorPartners)
    .where(
      and(
        eq(realtorPartners.id, partnerId),
        eq(realtorPartners.organizationId, authCtx.organizationId),
        isNull(realtorPartners.deletedAt),
      ),
    )
    .limit(1);

  if (!partner) {
    return { ok: false, error: "Partner not found." };
  }

  await backfillRealtorSourceDisplayOnLeads(
    authCtx.organizationId,
    partner.id,
    partner.displayName,
  );

  const [updated] = await db
    .update(realtorPartners)
    .set({ isActive: false })
    .where(
      and(
        eq(realtorPartners.id, partnerId),
        eq(realtorPartners.organizationId, authCtx.organizationId),
        isNull(realtorPartners.deletedAt),
      ),
    )
    .returning({ id: realtorPartners.id });

  if (!updated) {
    return { ok: false, error: "Partner not found." };
  }

  revalidatePath("/settings/realtors");
  revalidatePath("/settings/team");
  revalidatePath("/apply");
  revalidatePath("/realtor");
  revalidatePath("/realtor/branding");
  return { ok: true };
}

/**
 * Soft remove partner (`deleted_at` + inactive). Does not delete leads or auth users.
 * Before marking removed, fills `leads.source_display_name` when missing so reporting
 * survives if `realtor_partner_id` is ever cleared by a future DB hard-delete.
 * Prefer this over hard-deleting `realtor_partners` rows.
 */
export async function deleteRealtorPartnerPermanently(
  input: z.infer<typeof deleteRealtorPermanentSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authCtx = await getAuthContext();
  if (!isAdminRole(authCtx.role)) {
    return { ok: false, error: "Only administrators can remove partners." };
  }

  const parsed = deleteRealtorPermanentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Type DELETE (all caps) to confirm removal.',
    };
  }

  const [partner] = await db
    .select()
    .from(realtorPartners)
    .where(
      and(
        eq(realtorPartners.id, parsed.data.partnerId),
        eq(realtorPartners.organizationId, authCtx.organizationId),
      ),
    )
    .limit(1);

  if (!partner) {
    return { ok: false, error: "Partner not found." };
  }

  if (partner.deletedAt) {
    return { ok: false, error: "This partner is already removed." };
  }

  const linked = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.realtorPartnerId, partner.id));

  for (const tm of linked) {
    if (tm.userId === authCtx.userId) {
      return {
        ok: false,
        error:
          "You cannot remove a realtor account that uses your own login. Sign in as another admin or ask a teammate to remove it.",
      };
    }
  }

  await backfillRealtorSourceDisplayOnLeads(
    authCtx.organizationId,
    partner.id,
    partner.displayName,
  );

  const now = new Date();
  const [updated] = await db
    .update(realtorPartners)
    .set({ isActive: false, deletedAt: now })
    .where(
      and(
        eq(realtorPartners.id, partner.id),
        eq(realtorPartners.organizationId, authCtx.organizationId),
        isNull(realtorPartners.deletedAt),
      ),
    )
    .returning({ id: realtorPartners.id });

  if (!updated) {
    return { ok: false, error: "Could not update partner record." };
  }

  revalidatePath("/settings/realtors");
  revalidatePath("/settings/team");
  revalidatePath("/apply");
  revalidatePath("/realtor");
  revalidatePath("/realtor/branding");
  return { ok: true };
}

const updateRealtorBrandingSchema = z.object({
  partnerId: z.string().uuid(),
  personalLogoUrl: z.string().max(2000).nullable(),
  subtitle: z.string().max(500).nullable(),
  defaultApplicationLink: z.string().max(2000).nullable(),
});

function validateHttpsUrlField(
  label: string,
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  const t = raw.trim();
  if (t.length === 0) return { ok: true, value: null };
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") {
      return { ok: false, error: `${label} must use https://` };
    }
    return { ok: true, value: t };
  } catch {
    return { ok: false, error: `${label} is not a valid URL` };
  }
}

export async function updateRealtorPartnerBranding(
  input: z.infer<typeof updateRealtorBrandingSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthContext();
  const parsed = updateRealtorBrandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }

  const canAdmin = isAdminRole(auth.role);
  const canSelf =
    isRealtorPartnerRole(auth.role) &&
    auth.realtorPartnerId === parsed.data.partnerId;

  if (!canAdmin && !canSelf) {
    return { ok: false, error: "You do not have permission to update this partner." };
  }

  const [partner] = await db
    .select()
    .from(realtorPartners)
    .where(
      and(
        eq(realtorPartners.id, parsed.data.partnerId),
        eq(realtorPartners.organizationId, auth.organizationId),
        isNull(realtorPartners.deletedAt),
      ),
    )
    .limit(1);

  if (!partner) {
    return {
      ok: false,
      error: "Partner not found or has been removed from active use.",
    };
  }

  const subtitleNorm =
    parsed.data.subtitle === null || parsed.data.subtitle === ""
      ? null
      : parsed.data.subtitle.trim() || null;

  const logoRes = validateHttpsUrlField(
    "Logo URL",
    parsed.data.personalLogoUrl,
  );
  if (!logoRes.ok) return logoRes;

  const appRes = validateHttpsUrlField(
    "Default application URL",
    parsed.data.defaultApplicationLink,
  );
  if (!appRes.ok) return appRes;

  const defaultAppNorm = appRes.value
    ? normalizeExternalApplicationUrl(appRes.value)
    : null;

  await db
    .update(realtorPartners)
    .set({
      personalLogoUrl: logoRes.value,
      subtitle: subtitleNorm,
      defaultApplicationLink: defaultAppNorm,
    })
    .where(eq(realtorPartners.id, partner.id));

  revalidatePath("/settings/realtors");
  revalidatePath("/realtor");
  revalidatePath("/realtor/branding");
  revalidatePath("/apply");
  return { ok: true };
}
