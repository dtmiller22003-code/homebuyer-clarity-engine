"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { leads, realtorPartners } from "@/db/schema";
import { isAdminRole } from "@/lib/auth-roles";
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
