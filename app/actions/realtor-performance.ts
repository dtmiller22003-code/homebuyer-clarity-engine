// =============================================================================
// Realtor partner performance — admin only. Aggregates from `leads`.
// Includes inactive/deleted partners and orphan realtor attribution (no FK).
// =============================================================================

"use server";

import { createHash } from "node:crypto";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, realtorPartners } from "@/db/schema";
import { isAdminRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";
import type { RealtorPartnerAdminRow } from "@/app/actions/realtors";

export type RealtorPerformanceAdminRow = RealtorPartnerAdminRow & {
  leadsLast30Days: number;
  leadsThisMonth: number;
  leadsThisWeek: number;
  convertedCount: number;
  /** 0–100, or null when there are no leads. */
  conversionRatePercent: number | null;
  lastLeadAt: string | null;
};

export type RealtorLeaderboardMonthEntry = {
  partnerId: string;
  displayName: string;
  leadCount: number;
};

export type RealtorLeaderboardConverterEntry = {
  partnerId: string;
  displayName: string;
  conversionRatePercent: number;
  totalLeads: number;
};

export type RealtorLeaderboardSnapshot = {
  topThisMonth: RealtorLeaderboardMonthEntry[];
  topConverters: RealtorLeaderboardConverterEntry[];
};

type Agg = {
  totalLeads: number;
  leadsLast30Days: number;
  leadsThisMonth: number;
  leadsThisWeek: number;
  convertedCount: number;
  lastLeadAt: Date | null;
};

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/** Monday 00:00 UTC for the week containing `d`. */
function startOfUtcWeek(d: Date): Date {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
  const dow = x.getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setUTCDate(x.getUTCDate() + delta);
  return x;
}

function emptyAgg(): Agg {
  return {
    totalLeads: 0,
    leadsLast30Days: 0,
    leadsThisMonth: 0,
    leadsThisWeek: 0,
    convertedCount: 0,
    lastLeadAt: null,
  };
}

function mergeAgg(target: Agg, add: Agg): void {
  target.totalLeads += add.totalLeads;
  target.leadsLast30Days += add.leadsLast30Days;
  target.leadsThisMonth += add.leadsThisMonth;
  target.leadsThisWeek += add.leadsThisWeek;
  target.convertedCount += add.convertedCount;
  if (add.lastLeadAt) {
    if (!target.lastLeadAt || add.lastLeadAt > target.lastLeadAt) {
      target.lastLeadAt = add.lastLeadAt;
    }
  }
}

function rowToAgg(r: {
  totalLeads: number;
  leadsLast30Days: number;
  leadsThisMonth: number;
  leadsThisWeek: number;
  convertedCount: number;
  lastLeadAt: Date | null;
}): Agg {
  return {
    totalLeads: Number(r.totalLeads),
    leadsLast30Days: Number(r.leadsLast30Days),
    leadsThisMonth: Number(r.leadsThisMonth),
    leadsThisWeek: Number(r.leadsThisWeek),
    convertedCount: Number(r.convertedCount),
    lastLeadAt: r.lastLeadAt,
  };
}

function historicalRowId(slug: string | null, displayName: string | null): string {
  const s = slug == null ? "" : String(slug);
  const n = displayName == null ? "" : String(displayName);
  const h = createHash("sha1").update(`realtor|${s}|${n}`).digest("hex").slice(0, 24);
  return `hist-${h}`;
}

function normSlug(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export async function getRealtorPartnerPerformanceAdmin(): Promise<{
  rows: RealtorPerformanceAdminRow[];
  leaderboards: RealtorLeaderboardSnapshot;
}> {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) {
    return {
      rows: [],
      leaderboards: { topThisMonth: [], topConverters: [] },
    };
  }

  const orgId = auth.organizationId;
  const now = new Date();
  const thirtyDaysAgoIso = new Date(
    now.getTime() - 30 * 86400000,
  ).toISOString();
  const monthStartIso = startOfUtcMonth(now).toISOString();
  const weekStartIso = startOfUtcWeek(now).toISOString();

  const aggByPartner = await db
    .select({
      partnerId: leads.realtorPartnerId,
      totalLeads: sql<number>`count(*)::int`,
      leadsLast30Days: sql<number>`count(*) filter (where ${leads.createdAt} >= ${thirtyDaysAgoIso})::int`,
      leadsThisMonth: sql<number>`count(*) filter (where ${leads.createdAt} >= ${monthStartIso})::int`,
      leadsThisWeek: sql<number>`count(*) filter (where ${leads.createdAt} >= ${weekStartIso})::int`,
      convertedCount: sql<number>`count(*) filter (where ${leads.status} in ('closed', 'preapproved'))::int`,
      lastLeadAt: sql<Date | null>`max(${leads.createdAt})`,
    })
    .from(leads)
    .where(
      and(eq(leads.organizationId, orgId), isNotNull(leads.realtorPartnerId)),
    )
    .groupBy(leads.realtorPartnerId);

  const aggMap = new Map<string, Agg>();

  for (const r of aggByPartner) {
    if (!r.partnerId) continue;
    aggMap.set(r.partnerId, rowToAgg(r));
  }

  const orphanAgg = await db
    .select({
      sourceSlug: leads.sourceSlug,
      sourceDisplayName: leads.sourceDisplayName,
      totalLeads: sql<number>`count(*)::int`,
      leadsLast30Days: sql<number>`count(*) filter (where ${leads.createdAt} >= ${thirtyDaysAgoIso})::int`,
      leadsThisMonth: sql<number>`count(*) filter (where ${leads.createdAt} >= ${monthStartIso})::int`,
      leadsThisWeek: sql<number>`count(*) filter (where ${leads.createdAt} >= ${weekStartIso})::int`,
      convertedCount: sql<number>`count(*) filter (where ${leads.status} in ('closed', 'preapproved'))::int`,
      lastLeadAt: sql<Date | null>`max(${leads.createdAt})`,
    })
    .from(leads)
    .where(
      and(
        eq(leads.organizationId, orgId),
        eq(leads.sourceType, "realtor"),
        isNull(leads.realtorPartnerId),
      ),
    )
    .groupBy(leads.sourceSlug, leads.sourceDisplayName);

  const partners = await db
    .select()
    .from(realtorPartners)
    .where(eq(realtorPartners.organizationId, orgId));

  const orphanMergedIntoPartnerSlug = new Set<string>();

  for (const o of orphanAgg) {
    const oa = rowToAgg(o);
    if (oa.totalLeads === 0) continue;
    const slugKey = normSlug(o.sourceSlug);
    const matched =
      slugKey.length > 0
        ? partners.find((p) => normSlug(p.slug) === slugKey)
        : undefined;
    if (matched) {
      const cur = aggMap.get(matched.id) ?? emptyAgg();
      mergeAgg(cur, oa);
      aggMap.set(matched.id, cur);
      orphanMergedIntoPartnerSlug.add(slugKey);
    }
  }

  const rows: RealtorPerformanceAdminRow[] = partners.map((p) => {
    const a = aggMap.get(p.id) ?? emptyAgg();
    const total = a.totalLeads;
    const converted = a.convertedCount;
    const conversionRatePercent =
      total > 0 ? Math.round((converted / total) * 1000) / 10 : null;

    return {
      id: p.id,
      displayName: p.displayName,
      email: p.email,
      phone: p.phone,
      slug: p.slug,
      brokerage: p.brokerage,
      leadCount: total,
      isActive: p.isActive,
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
      personalLogoUrl: p.personalLogoUrl,
      subtitle: p.subtitle,
      defaultApplicationLink: p.defaultApplicationLink,
      leadsLast30Days: a.leadsLast30Days,
      leadsThisMonth: a.leadsThisMonth,
      leadsThisWeek: a.leadsThisWeek,
      convertedCount: converted,
      conversionRatePercent,
      lastLeadAt: a.lastLeadAt ? a.lastLeadAt.toISOString() : null,
    };
  });

  for (const o of orphanAgg) {
    const oa = rowToAgg(o);
    if (oa.totalLeads === 0) continue;
    const slugKey = normSlug(o.sourceSlug);
    if (slugKey.length > 0 && orphanMergedIntoPartnerSlug.has(slugKey)) continue;

    const display =
      o.sourceDisplayName?.trim() ||
      o.sourceSlug?.trim() ||
      "Former partner (unlinked)";
    const slugOut = o.sourceSlug?.trim() || "—";
    const hid = historicalRowId(o.sourceSlug, o.sourceDisplayName);

    rows.push({
      id: hid,
      displayName: display,
      email: "—",
      phone: null,
      slug: slugOut,
      brokerage: null,
      leadCount: oa.totalLeads,
      isActive: false,
      deletedAt: null,
      personalLogoUrl: null,
      subtitle: null,
      defaultApplicationLink: null,
      rowKind: "historical",
      leadsLast30Days: oa.leadsLast30Days,
      leadsThisMonth: oa.leadsThisMonth,
      leadsThisWeek: oa.leadsThisWeek,
      convertedCount: oa.convertedCount,
      conversionRatePercent:
        oa.totalLeads > 0
          ? Math.round((oa.convertedCount / oa.totalLeads) * 1000) / 10
          : null,
      lastLeadAt: oa.lastLeadAt ? oa.lastLeadAt.toISOString() : null,
    });
  }

  rows.sort((x, y) => x.displayName.localeCompare(y.displayName));

  /** Leaderboards: active partners only (clean default; full rows still returned for settings). */
  const livePartnerRows = rows.filter(
    (r) =>
      r.rowKind !== "historical" && r.isActive && !r.deletedAt,
  );

  const withLeadsMonth = livePartnerRows
    .filter((r) => r.leadsThisMonth > 0)
    .sort((a, b) => b.leadsThisMonth - a.leadsThisMonth)
    .slice(0, 5)
    .map((r) => ({
      partnerId: r.id,
      displayName: r.displayName,
      leadCount: r.leadsThisMonth,
    }));

  const withConversion = livePartnerRows
    .filter((r) => r.leadCount > 0 && r.conversionRatePercent !== null)
    .sort((a, b) => {
      const av = a.conversionRatePercent ?? 0;
      const bv = b.conversionRatePercent ?? 0;
      if (bv !== av) return bv - av;
      return b.leadCount - a.leadCount;
    })
    .slice(0, 5)
    .map((r) => ({
      partnerId: r.id,
      displayName: r.displayName,
      conversionRatePercent: r.conversionRatePercent ?? 0,
      totalLeads: r.leadCount,
    }));

  return {
    rows,
    leaderboards: {
      topThisMonth: withLeadsMonth,
      topConverters: withConversion,
    },
  };
}
