// =============================================================================
// Drizzle schema for the Homebuyer Clarity Engine.
// Run `npm run db:push` to sync (fresh install) OR run supabase/migrate-to-2b.sql
// against an existing Phase 2A database.
//
// DESIGN NOTES:
// - UUIDs for PKs (matches Supabase auth.users IDs)
// - Pillar fields stored as text enums (matches lib/types.ts)
// - `decision` column is JSONB — computed on write, cached for read
// - Row-Level Security lives in supabase/policies.sql, not here
//
// PHASE 2B ADDITIONS:
// - organizations: branding colors, logo URL, font preset, default assignee, contact
// - team_members: slug (public routing), phone, bio, calendly_url (reserved)
// - leads: referrer_lo_slug (attribution from /apply/[slug])
// - NEW: realtor_partners (schema only, no UI yet)
// - NEW: rate_limits (IP-based intake throttling)
// - NEW: lead_documents (lead file metadata + Supabase Storage pointer)
// =============================================================================

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { LeadDecision } from "@/lib/types";

// -----------------------------------------------------------------------------
// Enums — mirror the string-literal unions in lib/types.ts
// -----------------------------------------------------------------------------
export const creditRangeEnum = pgEnum("credit_range", [
  "BELOW_580",
  "580_619",
  "620_679",
  "680_739",
  "740_PLUS",
]);

export const incomeRangeEnum = pgEnum("income_range", [
  "UNDER_40K",
  "40K_60K",
  "60K_90K",
  "90K_150K",
  "150K_PLUS",
]);

export const cashRangeEnum = pgEnum("cash_range", [
  "UNDER_5K",
  "5K_15K",
  "15K_30K",
  "30K_60K",
  "60K_PLUS",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "W2",
  "SELF_EMPLOYED_FILED",
  "SELF_EMPLOYED_NOT_FILED",
  "MIXED",
  "RETIRED",
]);

export const occupancyIntentEnum = pgEnum("occupancy_intent", [
  "PRIMARY_HOME",
  "INVESTMENT_PROPERTY",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "WEBSITE_FORM",
  "REFERRAL_AGENT",
  "REFERRAL_PAST_CLIENT",
  "SOCIAL_MEDIA",
  "PAID_AD",
  "MANUAL_ENTRY",
  "OPEN_HOUSE",
  "OTHER",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "reviewed",
  "approved",
  "archived",
  "sent_to_crm",
]);

// Phase 2B
export const fontPresetEnum = pgEnum("font_preset", [
  "SYSTEM",
  "SERIF",
  "ROUNDED",
]);

// -----------------------------------------------------------------------------
// organizations
// PHASE 2B: branding + default assignee + buyer-visible contact
// -----------------------------------------------------------------------------
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),

  // Branding (Phase 2B) — applied to public /apply/* pages only
  primaryColor: text("primary_color").notNull().default("#1e40af"),
  secondaryColor: text("secondary_color").notNull().default("#64748b"),
  accentColor: text("accent_color").notNull().default("#f59e0b"),
  logoUrl: text("logo_url"), // URL field only in 2B; upload deferred to Phase 3
  fontPreset: fontPresetEnum("font_preset").notNull().default("SYSTEM"),

  // Default assignee for unrouted /apply submissions.
  // Logically FKs to team_members.id, but modeling the circular FK is messy
  // in Drizzle — we enforce referential integrity in the app layer instead.
  defaultAssigneeId: uuid("default_assignee_id"),

  // Buyer-visible contact info (shown on result pages when LO not specified)
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// team_members
// PHASE 2B: public profile fields (slug drives /apply/[slug] routing)
// -----------------------------------------------------------------------------
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("agent"),

    // Phase 2B — public profile
    slug: text("slug"), // unique per org; null = no public page
    phone: text("phone"),
    bio: text("bio"),
    calendlyUrl: text("calendly_url"), // reserved for Phase 3

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("team_members_org_idx").on(table.organizationId),
    // One slug per org — prevents /apply/diana from routing two places
    orgSlugIdx: uniqueIndex("team_members_org_slug_idx").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

// -----------------------------------------------------------------------------
// leads
// PHASE 2B: referrer_lo_slug captures which /apply/[slug] the buyer came through
// -----------------------------------------------------------------------------
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Contact
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),

    // Team/ops
    assignedTo: text("assigned_to").notNull(),
    createdBy: text("created_by").notNull(),
    leadSource: leadSourceEnum("lead_source").notNull(),

    // Phase 2B — attribution
    referrerLoSlug: text("referrer_lo_slug"),

    // Pillar inputs
    creditRange: creditRangeEnum("credit_range").notNull(),
    annualGrossIncome: incomeRangeEnum("annual_gross_income").notNull(),
    monthlyDebtPayments: integer("monthly_debt_payments").notNull(),
    cashAvailable: cashRangeEnum("cash_available").notNull(),

    // Employment
    employmentType: employmentTypeEnum("employment_type").notNull(),
    occupancyIntent: occupancyIntentEnum("occupancy_intent")
      .notNull()
      .default("PRIMARY_HOME"),
    hasFiledTaxes: text("has_filed_taxes"), // 'true' | 'false' | null
    heavyWriteOffs: text("heavy_write_offs"),

    targetPurchasePrice: integer("target_purchase_price"),

    notes: text("notes"),
    status: leadStatusEnum("status").notNull().default("new"),

    // Cached computed decision
    decision: jsonb("decision").$type<LeadDecision>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("leads_org_idx").on(table.organizationId),
    statusIdx: index("leads_status_idx").on(table.status),
    assignedIdx: index("leads_assigned_idx").on(table.assignedTo),
  }),
);

// -----------------------------------------------------------------------------
// lead_documents — files attached to a lead (metadata + Supabase Storage path)
// Upload flow is separate; this table stores the pointer for admin file management.
// -----------------------------------------------------------------------------
export const leadDocuments = pgTable(
  "lead_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    /** Supabase Storage bucket id (e.g. lead-documents). Null = not stored in our bucket. */
    storageBucket: text("storage_bucket"),
    /**
     * Object key within the bucket (e.g. {orgId}/{leadId}/file.pdf).
     * When null/empty, delete only removes the DB row (no storage object).
     */
    storagePath: text("storage_path"),
    originalFilename: text("original_filename").notNull(),
    contentType: text("content_type"),
    uploadedByUserId: uuid("uploaded_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("lead_documents_org_idx").on(table.organizationId),
    leadIdx: index("lead_documents_lead_idx").on(table.leadId),
  }),
);

// -----------------------------------------------------------------------------
// lead_events — append-only history of actions on a lead
// -----------------------------------------------------------------------------
export const leadEvents = pgTable(
  "lead_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").notNull(),
    actorName: text("actor_name").notNull(),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    leadIdx: index("lead_events_lead_idx").on(table.leadId),
  }),
);

// -----------------------------------------------------------------------------
// realtor_partners (PHASE 2B — schema only; UI deferred to Phase 3)
// Note: actorUserId is NOT required on lead_events when written from the
// public intake flow — we use a sentinel UUID. See app/actions/intake.ts.
// -----------------------------------------------------------------------------
export const realtorPartners = pgTable(
  "realtor_partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    slug: text("slug").notNull(),
    brokerage: text("brokerage"),
    // Stored as text for consistency with hasFiledTaxes/heavyWriteOffs pattern
    active: text("active").notNull().default("true"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("realtor_partners_org_idx").on(table.organizationId),
    orgSlugIdx: uniqueIndex("realtor_partners_org_slug_idx").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

// -----------------------------------------------------------------------------
// rate_limits (PHASE 2B)
// Simple IP-based throttling. One row per (key, hour bucket). Upsert + increment.
// No cleanup job — Phase 3 can TRUNCATE periodically if size becomes an issue.
// -----------------------------------------------------------------------------
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // e.g. "intake:192.168.1.1"
    bucket: text("bucket").notNull(), // e.g. "2026-04-18T14" (ISO hour)
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    keyBucketIdx: uniqueIndex("rate_limits_key_bucket_idx").on(
      table.key,
      table.bucket,
    ),
  }),
);

// -----------------------------------------------------------------------------
// Type exports
// -----------------------------------------------------------------------------
export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;
export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type LeadEventRow = typeof leadEvents.$inferSelect;
export type LeadDocumentRow = typeof leadDocuments.$inferSelect;
export type OrganizationRow = typeof organizations.$inferSelect;
export type RealtorPartnerRow = typeof realtorPartners.$inferSelect;
