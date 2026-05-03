"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { leads, realtorPartners } from "@/db/schema";
import { normalizeExternalApplicationUrl } from "@/lib/default-application-url";
import { isAdminRole, isRealtorPartnerRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
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
  personalLogoUrl: string | null;
  subtitle: string | null;
  defaultApplicationLink: string | null;
};

export async function listRealtorPartnersAdmin(): Promise<
  RealtorPartnerAdminRow[]
> {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) return [];

  const partners = await db
    .select()
    .from(realtorPartners)
    .where(eq(realtorPartners.organizationId, auth.organizationId));

  const out: RealtorPartnerAdminRow[] = [];
  for (const p of partners) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.realtorPartnerId, p.id));
    out.push({
      id: p.id,
      displayName: p.displayName,
      email: p.email,
      phone: p.phone,
      slug: p.slug,
      brokerage: p.brokerage,
      leadCount: Number(n),
      personalLogoUrl: p.personalLogoUrl,
      subtitle: p.subtitle,
      defaultApplicationLink: p.defaultApplicationLink,
    });
  }
  out.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return out;
}

export async function createRealtorPartner(
  input: z.infer<typeof createPartnerSchema>,
): Promise<
  { ok: true; id: string; slug: string } | { ok: false; error: string }
> {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) {
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
        eq(realtorPartners.organizationId, auth.organizationId),
        eq(realtorPartners.slug, slug),
      ),
    )
    .limit(1);

  if (dup.length > 0) {
    return {
      ok: false,
      error: "That slug is already in use. Choose a different slug or name.",
    };
  }

  try {
    const [row] = await db
      .insert(realtorPartners)
      .values({
        organizationId: auth.organizationId,
        displayName: parsed.data.displayName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        slug,
        brokerage: parsed.data.brokerage || null,
        active: "true",
      })
      .returning({ id: realtorPartners.id, slug: realtorPartners.slug });

    if (!row) {
      return { ok: false, error: "Could not create partner." };
    }

    revalidatePath("/settings/realtors");
    return { ok: true, id: row.id, slug: row.slug };
  } catch {
    return { ok: false, error: "Could not create partner. Try a different slug." };
  }
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
      ),
    )
    .limit(1);

  if (!partner) {
    return { ok: false, error: "Partner not found." };
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
