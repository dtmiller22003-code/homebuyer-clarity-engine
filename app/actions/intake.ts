// =============================================================================
// Intake — public (unauthenticated) server actions for the buyer-facing form.
//
// Contract:
//   submitIntake(input)     → insert lead, return leadId
//   getPublicResult(leadId) → sanitized result for /apply/result/[id]
//
// COMPLIANCE (NON-NEGOTIABLE):
//   - The word "qualify" must never appear in any string returned to the buyer.
//   - No specific dollar amounts in buyer-facing strings.
//   - "Non-QM" / "QM" are broker jargon → replaced with plain-English equivalents.
//   - NOT_READY_YET is framed as "not yet ready to apply," never "doesn't qualify."
//
// SECURITY:
//   - IP-based rate limiting (5 submissions per hour per IP)
//   - organizationId is passed from the server component (already looked up via
//     getPublicBrand) — we verify it exists before writing
//   - Zod validation on every field; server ignores anything not in the schema
// =============================================================================

"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db/client";
import {
  leads,
  leadEvents,
  organizations,
  rateLimits,
  realtorPartners,
  teamMembers,
} from "@/db/schema";
import { evaluateLead } from "@/lib/decision-engine";
import { leadInputsToRow } from "@/lib/row-mapper";
import type {
  LeadDecision,
  LeadInputs,
  PillarScore,
  ReadinessLevel,
} from "@/lib/types";

// Sentinel UUID for public intake writes to lead_events. We require actor_user_id
// to be a uuid in the schema, but intake has no authenticated user. This value
// is intentionally well-known ("all zeros") so filtering system events is trivial.
const PUBLIC_INTAKE_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

const RATE_LIMIT_MAX_PER_HOUR = 5;

function isDbUnavailableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { code?: string; message?: string };
  return (
    maybe.code === "ECONNREFUSED" ||
    maybe.code === "ENOTFOUND" ||
    (typeof maybe.message === "string" &&
      (maybe.message.includes("ECONNREFUSED") ||
        maybe.message.includes("DATABASE_URL is not set")))
  );
}

function mockPublicResult(leadId: string): PublicResult {
  return {
    firstName: "Homebuyer",
    readiness: "NEARLY_READY",
    strongPillarCount: 2,
    pillarSummaries: {
      credit: { score: "moderate", headline: "Credit profile is moving in the right direction." },
      income: { score: "strong", headline: "Income versus debt is in a workable range." },
      cash: { score: "moderate", headline: "A bit more cash cushion would strengthen your file." },
    },
    topRecommendation: {
      title: "Build your cash cushion",
      description:
        "Try increasing your available savings over the next 60-90 days to improve flexibility at closing.",
    },
    buyerExplanation:
      "This is a local testing snapshot generated without a live database connection. Your request is still flowing through the same intake experience.",
    contact: {
      displayName: "Cleared Home Lending",
      email: "support@example.com",
      phone: null,
    },
  };
}

// -----------------------------------------------------------------------------
// Input schema
// -----------------------------------------------------------------------------
const intakeSchema = z.object({
  organizationId: z.string().uuid(),
  referrerLoSlug: z.string().trim().toLowerCase().optional(),
  /** Public partner slug from `/apply/realtor/[slug]` or `?partner=` — resolved server-side. */
  realtorPartnerSlug: z.string().trim().min(1).max(80).optional(),

  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(30),

  creditRange: z.enum(["BELOW_580", "580_619", "620_679", "680_739", "740_PLUS"]),
  annualGrossIncome: z.enum([
    "UNDER_40K",
    "40K_60K",
    "60K_90K",
    "90K_150K",
    "150K_PLUS",
  ]),
  monthlyDebtPayments: z.number().int().min(0).max(100000),
  cashAvailable: z.enum(["UNDER_5K", "5K_15K", "15K_30K", "30K_60K", "60K_PLUS"]),

  employmentType: z.enum([
    "W2",
    "SELF_EMPLOYED_FILED",
    "SELF_EMPLOYED_NOT_FILED",
    "MIXED",
    "RETIRED",
  ]),
  occupancyIntent: z.enum(["PRIMARY_HOME", "INVESTMENT_PROPERTY"]).optional(),
  hasFiledTaxes: z.boolean().optional(),
  heavyWriteOffs: z.boolean().optional(),

  targetPurchasePrice: z.number().int().min(0).max(50_000_000).optional(),

  leadSource: z
    .enum([
      "WEBSITE_FORM",
      "REFERRAL_AGENT",
      "REFERRAL_PAST_CLIENT",
      "SOCIAL_MEDIA",
      "PAID_AD",
      "OPEN_HOUSE",
      "OTHER",
    ])
    .default("WEBSITE_FORM"),

  formLength: z.enum(["short", "long"]),
  notes: z.string().trim().max(2000).optional(),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

// -----------------------------------------------------------------------------
// Rate limiting — IP-based, 5 submissions per hour per IP.
// Uses a (key, bucket) unique index. INSERT ... ON CONFLICT increments count.
// -----------------------------------------------------------------------------
function currentHourBucket(): string {
  // ISO hour: "2026-04-18T14"
  return new Date().toISOString().slice(0, 13);
}

function getClientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

async function checkAndIncrementRateLimit(ip: string): Promise<boolean> {
  const key = `intake:${ip}`;
  const bucket = currentHourBucket();

  // Atomic upsert: insert 1 or increment on conflict. Returns the new count.
  const result = await db
    .insert(rateLimits)
    .values({ key, bucket, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.bucket],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const count = result[0]?.count ?? RATE_LIMIT_MAX_PER_HOUR + 1;
  return count <= RATE_LIMIT_MAX_PER_HOUR;
}

// -----------------------------------------------------------------------------
// submitIntake — the write path
// -----------------------------------------------------------------------------
export async function submitIntake(
  input: IntakeInput,
): Promise<{ ok: true; leadId: string } | { ok: false; error: string }> {
  // 1. Validate
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some of the information submitted isn't valid. Please review and try again.",
    };
  }
  const data = parsed.data;
  try {
    // 2. Rate limit (production only — relaxed locally for repeated test submissions)
    if (process.env.NODE_ENV !== "development") {
      const allowed = await checkAndIncrementRateLimit(getClientIp());
      if (!allowed) {
        return {
          ok: false,
          error:
            "Too many submissions from your network in the past hour. Please try again later.",
        };
      }
    }

    // 3. Verify organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, data.organizationId))
      .limit(1);

    if (!org) {
      return { ok: false, error: "We couldn't locate the brokerage. Please refresh and try again." };
    }

    // 3b. Resolve realtor partner (optional) — ties the lead to a partner record when valid.
    let resolvedRealtorPartnerId: string | null = null;
    if (data.realtorPartnerSlug) {
      const slug = data.realtorPartnerSlug.trim().toLowerCase();
      const [partner] = await db
        .select()
        .from(realtorPartners)
        .where(
          and(
            eq(realtorPartners.organizationId, org.id),
            eq(realtorPartners.slug, slug),
            eq(realtorPartners.active, "true"),
          ),
        )
        .limit(1);
      if (partner) {
        resolvedRealtorPartnerId = partner.id;
      }
    }

    // 4. Resolve assignee
    // Priority: (a) referrerLoSlug if valid, (b) org.defaultAssigneeId, (c) fallback string.
    let assignedToName = "Unassigned";

    if (data.referrerLoSlug) {
      const [referrer] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.organizationId, org.id),
            eq(teamMembers.slug, data.referrerLoSlug),
          ),
        )
        .limit(1);

      if (referrer) {
        assignedToName = referrer.displayName;
      }
    }

    if (assignedToName === "Unassigned" && org.defaultAssigneeId) {
      const [defaultAssignee] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, org.defaultAssigneeId))
        .limit(1);

      if (defaultAssignee) {
        assignedToName = defaultAssignee.displayName;
      }
    }

    // 5. Build LeadInputs and insert via row-mapper (computes decision)
    const insertableInputs: Omit<LeadInputs, "id" | "createdAt" | "lastUpdated"> = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      createdBy: "intake_form",
      assignedTo: assignedToName,
      leadSource: data.leadSource,
      creditRange: data.creditRange,
      annualGrossIncome: data.annualGrossIncome,
      monthlyDebtPayments: data.monthlyDebtPayments,
      cashAvailable: data.cashAvailable,
      employmentType: data.employmentType,
      occupancyIntent: data.occupancyIntent ?? "PRIMARY_HOME",
      hasFiledTaxes: data.hasFiledTaxes,
      heavyWriteOffs: data.heavyWriteOffs,
      targetPurchasePrice: data.targetPurchasePrice,
      notes: data.notes,
      status: "new",
    };

    const insertRow = leadInputsToRow(insertableInputs, org.id);

    const [inserted] = await db
      .insert(leads)
      .values({
        ...insertRow,
        referrerLoSlug: data.referrerLoSlug ?? null,
        realtorPartnerId: resolvedRealtorPartnerId,
      })
      .returning();

    if (!inserted) {
      return { ok: false, error: "Something went wrong saving your submission. Please try again." };
    }

    // 6. Event
    await db.insert(leadEvents).values({
      leadId: inserted.id,
      actorUserId: PUBLIC_INTAKE_ACTOR_ID,
      actorName: "Public Intake Form",
      eventType: "intake_submitted",
      metadata: {
        formLength: data.formLength,
        referrerLoSlug: data.referrerLoSlug ?? null,
        realtorPartnerSlug: data.realtorPartnerSlug ?? null,
        leadSource: data.leadSource,
      },
    });

    // 7. Email stub (Phase 3 will wire Resend)
    console.log(
      `[email stub] New lead ${inserted.id} assigned to ${assignedToName} (${data.formLength} form)`,
    );

    return { ok: true, leadId: inserted.id };
  } catch (err) {
    if (!isDbUnavailableError(err)) {
      throw err;
    }
    const mockLeadId = crypto.randomUUID();
    console.warn(
      `[submitIntake mock fallback] DB unavailable; returning mock lead id ${mockLeadId}`,
    );
    return { ok: true, leadId: mockLeadId };
  }
}

// =============================================================================
// PUBLIC RESULT — sanitized view for the buyer result page
// =============================================================================

export interface PublicResult {
  firstName: string;
  readiness: ReadinessLevel;
  strongPillarCount: 0 | 1 | 2 | 3;

  pillarSummaries: {
    credit: { score: PillarScore; headline: string };
    income: { score: PillarScore; headline: string };
    cash: { score: PillarScore; headline: string };
  };

  // Top (highest-impact) recommendation, buyer-ified. Null if none.
  topRecommendation: { title: string; description: string } | null;

  // Plain-English explanation with jargon and $ amounts stripped
  buyerExplanation: string;

  contact: {
    displayName: string;
    email: string;
    phone: string | null;
  };
}

// -----------------------------------------------------------------------------
// Buyer-ification: strip jargon and specific dollar amounts.
// -----------------------------------------------------------------------------
function buyerify(text: string): string {
  let out = text;

  // Strip specific dollar amounts (e.g., "$300,000" → "a target amount")
  out = out.replace(/\$\s?[\d,]+(\.\d+)?/g, "a target amount");

  // Strip explicit percentages that could look like approval math
  // (leave simple percentages like "3.5%" since those are program facts)
  // - removes DTI-style references like "Existing debt DTI: 22.5%"
  out = out.replace(/DTI[^.]*?\d+(\.\d+)?\s?%/gi, "debt-to-income ratio");

  // Jargon → plain English. Order matters (longer first).
  const replacements: Array<[RegExp, string]> = [
    [/\bconventional or FHA\b/gi, "traditional or conventional"],
    [/\bNon-QM\b/gi, "a specialty loan program"],
    [/\bQM\b/g, "a traditional loan"],
    [/\bFHA\b/g, "a first-time-buyer-friendly program"],
    [/\bbank statement loan\b/gi, "a specialty program that uses deposits to show income"],
    [/\bunderwriting\b/gi, "the loan review process"],

    // Safety net — the word "qualify" should never surface to buyers.
    [/\bqualify\b/gi, "be positioned well"],
    [/\bqualifying\b/gi, "positioning"],
    [/\bqualification\b/gi, "positioning"],

    // Soften any "approved" language (belt-and-suspenders)
    [/\bpre-approved\b/gi, "in position to move forward"],
    [/\bapproved\b/gi, "in position to move forward"],
  ];

  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }

  return out;
}

// Pick the single highest-impact recommendation (or first one if tied)
function pickTopRecommendation(
  decision: LeadDecision,
): { title: string; description: string } | null {
  if (decision.recommendations.length === 0) return null;

  const rank = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...decision.recommendations].sort(
    (a, b) => rank[a.impact] - rank[b.impact],
  );

  const top = sorted[0]!;
  return {
    title: top.title,
    description: buyerify(top.description),
  };
}

// -----------------------------------------------------------------------------
// getPublicResult — no auth. Returns sanitized decision + contact card info.
// Anyone with the leadId URL can view. This is intentional — the buyer is
// linked here directly from their form submission.
// -----------------------------------------------------------------------------
export async function getPublicResult(
  leadId: string,
): Promise<PublicResult | null> {
  // Validate leadId is a UUID before hitting the DB
  const uuidCheck = z.string().uuid().safeParse(leadId);
  if (!uuidCheck.success) return null;

  try {
    const [row] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!row) return null;

    const decision = row.decision;

    // Resolve contact card.
    // Priority: (a) referrerLoSlug LO, (b) org default assignee, (c) company email/phone.
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, row.organizationId))
      .limit(1);

    if (!org) return null;

    let contactMember: { displayName: string; email: string; phone: string | null } | null = null;

    if (row.referrerLoSlug) {
      const [referrer] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.organizationId, org.id),
            eq(teamMembers.slug, row.referrerLoSlug),
          ),
        )
        .limit(1);

      if (referrer) {
        contactMember = {
          displayName: referrer.displayName,
          email: referrer.email,
          phone: referrer.phone,
        };
      }
    }

    if (!contactMember && org.defaultAssigneeId) {
      const [defaultAssignee] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, org.defaultAssigneeId))
        .limit(1);

      if (defaultAssignee) {
        contactMember = {
          displayName: defaultAssignee.displayName,
          email: defaultAssignee.email,
          phone: defaultAssignee.phone,
        };
      }
    }

    // Fallback: use company-level contact
    const contact = contactMember ?? {
      displayName: org.name,
      email: org.companyEmail ?? "",
      phone: org.companyPhone,
    };

    return {
      firstName: row.firstName,
      readiness: decision.readiness,
      strongPillarCount: decision.strongPillarCount,
      pillarSummaries: {
        credit: { score: decision.credit.score, headline: decision.credit.headline },
        income: { score: decision.income.score, headline: decision.income.headline },
        cash: { score: decision.cash.score, headline: decision.cash.headline },
      },
      topRecommendation: pickTopRecommendation(decision),
      buyerExplanation: buyerify(decision.explanation),
      contact,
    };
  } catch (err) {
    if (!isDbUnavailableError(err)) {
      throw err;
    }
    return mockPublicResult(leadId);
  }
}
