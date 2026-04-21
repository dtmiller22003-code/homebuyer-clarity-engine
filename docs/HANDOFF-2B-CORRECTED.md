# Homebuyer Clarity Engine — Phase 2B Handoff (CORRECTED)

**Last updated:** April 18, 2026
**Replaces:** The previous HANDOFF.md, which incorrectly claimed Phase 2B was ~60% complete.
**Actual state:** Phase 2A complete and verified. Phase 2B **0% built**.
**Next session goal:** Build Phase 2B end-to-end.

---

## How to Use This Document

Open Cowork, point it at your `homebuyer-clarity-engine/` folder on disk, paste this entire file as the first message, then say:

> "This is my project. Act as my CEO/CFO partner per my userPreferences. Execute Phase 2B per this document. Do not skip steps. Build → type-check → production-build before declaring done."

---

## Why This Doc Exists (Read This First)

The previous handoff marked the following as ✅ complete when in fact **none of them exist** in the codebase:

- `app/actions/intake.ts`, `app/actions/public.ts`
- `app/apply/layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `short/page.tsx`, `long/page.tsx`, `result/[id]/page.tsx`
- `components/intake/FormFields.tsx`, `formOptions.ts`, `ShortIntakeForm.tsx`, `LongIntakeForm.tsx`
- `lib/supabase/service.ts`
- Schema columns for branding, LO slugs, realtor_partners, rate_limits
- Updated `supabase/policies.sql` for Phase 2B
- `supabase/migrate-to-2b.sql`

Phase 2A is genuinely complete: dashboard, auth, leads CRUD, decision engine, seed. It type-checks clean. Build Phase 2B on top of that foundation.

---

## Working Style (CRITICAL)

User's stated preferences:

> "I want you to act like my CEO/CFO. I like direct answers and questions even with a little logical pushback that helps me mold my ideas. If you are not sure or confident in your answer or my response, bring it up so that we can come to a logical conclusion."

**In practice:**
- Push back when a request is wrong or when there's a better option
- Flag risks proactively (legal, technical, business)
- Give recommendations, not option menus
- Direct, no fluff
- Ask questions only when genuinely needed
- Show file structure at milestones
- Don't guess API capabilities — verify

---

## Core Business Logic (NON-NEGOTIABLE, UNCHANGED)

### The Three Pillars
1. **Credit**
2. **Income vs Debt** (DTI using GROSS income, credit-report debts only, NOT lifestyle)
3. **Cash to Close / Reserves**

### Readiness Rule
- 3/3 strong = ideal client
- 2/3 strong = workable deal
- ≤1 strong = not ready yet

### Credit Logic
- 580+ → FHA eligible (standard path)
- Below 580 → requires 10% down
- 620+ → stronger positioning (also needed for most Non-QM)

### Self-Employed Logic
- **Taxes not filed** → Non-QM (620+, 10–20% down, ~2% closing)
- **Taxes filed + owed taxes** → usable income, tax bill counts toward DTI
- **Taxes filed + heavy write-offs** → qualifying income is limited

The decision engine (`lib/decision-engine.ts`) already encodes all of this. **Do not touch it.** Pure TypeScript, zero dependencies, called by intake action + lead update action + seed.

---

## Tech Stack (LOCKED)

| Layer      | Choice                              |
| ---------- | ----------------------------------- |
| Framework  | Next.js 14 (App Router)             |
| Language   | TypeScript (strict)                 |
| Styling    | Tailwind — no component library     |
| DB         | Supabase Postgres                   |
| Auth       | Supabase Auth (email/password)      |
| ORM        | Drizzle                             |
| Validation | Zod                                 |
| Hosting    | Vercel                              |

**Rules:**
- No UI component libraries (no shadcn, MUI, Chakra) — user said no
- No paid services without approval
- Server Actions over REST routes

---

## Phase 2B Decisions (All Locked In)

### 1. Form Strategy
- `/apply` landing asks: short (2 min) or detailed (5 min)?
- Short: 8 fields, one screen
- Long: 14 fields, 2-step wizard

### 2. Result Pages — Readiness-Aware
- `READY_NOW` → green accent, "You're in a strong position"
- `NEARLY_READY` → amber accent, "You're almost there"
- `NOT_READY_YET` → neutral, educational, "Here's where you stand"

### 3. Compliance Guardrails (ALL FOUR, NON-NEGOTIABLE)
- Word **"qualify" NEVER** appears on buyer pages — use "strong position," "on track," "room to improve"
- Every buyer result page shows:
  > *"This is an educational assessment, not a loan pre-approval or commitment to lend. Final loan decisions require a full application."*
- **No specific dollar amounts** on buyer pages (directional only)
- `NOT_READY_YET` is framed as "not yet ready to apply," **never** "you don't qualify"

**Forbidden on buyer pages:** qualify, approved, pre-approved, guaranteed, "you don't qualify"
**Preferred:** strong position, on track, room to grow, not yet ready to apply

### 4. Scheduling
- Contact card only (no Calendly this phase). Shows LO name + email + phone.
- `calendly_url` column exists for future use.

### 5. Assignment Routing
- Public `/apply` → org's default assignee
- `/apply/[lo-slug]` → routed to that specific LO
- Realtor partners: schema exists, no UI yet

### 6. Branding Tier — Medium
- Primary + secondary + accent colors
- **Logo URL text field only** (upload deferred to Phase 3 per user decision)
- 3 font presets (SYSTEM, SERIF, ROUNDED)
- Applies to public `/apply/*` pages only — internal dashboard stays neutral

### 7. Company name: **Cleared Home Lending**

### 8. Email notifications: **console.log only** in Phase 2B. Phase 3 wires Resend.

### 9. Rate limiting: IP-based, 5 submissions per hour. CAPTCHA deferred.

---

## Current State (Verified)

### ✅ Phase 2A — Complete and type-checks clean

```
homebuyer-clarity-engine/
├── app/
│   ├── actions/
│   │   └── leads.ts              ✅ listLeads, updateLeadStatus, updateLeadInputs, listTeamMembers
│   ├── login/
│   │   ├── page.tsx              ✅
│   │   └── LoginForm.tsx         ✅
│   ├── layout.tsx                ✅
│   ├── page.tsx                  ✅ Server component → DashboardClient
│   └── globals.css               ✅
├── components/
│   ├── DashboardClient.tsx       ✅
│   ├── TopBar.tsx                ✅ (no Settings link yet — Phase 2B adds)
│   ├── StatsBar.tsx              ✅
│   ├── Sidebar.tsx               ✅
│   ├── LeadFeed.tsx              ✅
│   ├── LeadCard.tsx              ✅
│   ├── DetailPanel.tsx           ✅
│   ├── PillarScore.tsx           ✅
│   └── Badge.tsx                 ✅
├── db/
│   ├── schema.ts                 ✅ Phase 2A shape (no branding/slugs/realtors/rate_limits yet)
│   └── client.ts                 ✅
├── lib/
│   ├── types.ts                  ✅
│   ├── decision-engine.ts        ✅ SACRED — do not modify
│   ├── row-mapper.ts             ✅
│   ├── mock-data.ts              ✅ 8 scenarios
│   └── supabase/
│       ├── client.ts             ✅ Browser client
│       ├── server.ts             ✅ Server client
│       └── auth.ts               ✅ getAuthContext()
├── scripts/
│   └── seed.ts                   ✅ (needs Phase 2B update — see below)
├── supabase/
│   └── policies.sql              ✅ Phase 2A RLS (needs Phase 2B additions)
├── middleware.ts                 ✅ (needs /apply added to PUBLIC_ROUTES)
├── drizzle.config.ts             ✅
├── package.json                  ✅
├── tsconfig.json                 ✅
├── tailwind.config.ts            ✅
├── postcss.config.js             ✅
└── next.config.js                ✅
```

### ❌ Phase 2B — Nothing built yet

All files listed below need to be created or updated.

---

## Phase 2B Build Plan (Execute In This Order)

### Step 1 — Update `db/schema.ts`

**Additive changes only** to preserve Phase 2A data:

**organizations table gains:**
- `primaryColor` text, default `#1e40af`
- `secondaryColor` text, default `#64748b`
- `accentColor` text, default `#f59e0b`
- `logoUrl` text (nullable)
- `fontPreset` new pgEnum `["SYSTEM", "SERIF", "ROUNDED"]`, default `SYSTEM`
- `defaultAssigneeId` uuid (nullable) — references team_members.id but Drizzle can't model the circular FK cleanly, so enforce in app layer
- `companyEmail` text (nullable)
- `companyPhone` text (nullable)

**team_members table gains:**
- `slug` text (nullable — unique per org via `uniqueIndex` on [organization_id, slug])
- `phone` text (nullable)
- `bio` text (nullable)
- `calendlyUrl` text (nullable, reserved for Phase 3)

**leads table gains:**
- `referrerLoSlug` text (nullable) — captures which `/apply/[slug]` the buyer came through

**New table: `realtor_partners`** (schema only, no UI in 2B)
- id, organizationId (FK), displayName, email, phone, slug, brokerage, active (text 'true'/'false'), createdAt

**New table: `rate_limits`**
- id, key (text — e.g. `"intake:1.2.3.4"`), bucket (text — ISO hour like `"2026-04-18T14"`), count, createdAt
- Unique index on [key, bucket]

**New pgEnum: `fontPresetEnum`** with values `["SYSTEM", "SERIF", "ROUNDED"]`

**Export these new types:** `OrganizationRow`, `RealtorPartnerRow`

### Step 2 — Write `supabase/migrate-to-2b.sql`

Idempotent SQL migration for existing Phase 2A installs. Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` everywhere. Includes:

- `ALTER TYPE` for the new font_preset enum (or create it first)
- All column additions to organizations, team_members, leads
- Create realtor_partners table
- Create rate_limits table
- Create the unique indexes on team_members(organization_id, slug) and realtor_partners(organization_id, slug)

**Safety:** every statement must be idempotent. Test by running twice — second run should be a no-op.

### Step 3 — Update `supabase/policies.sql`

Add RLS policies for the new tables:

- **organizations UPDATE policy**: only admins of that org can update (check role = 'admin')
- **team_members UPDATE policy**: admins can update any member in their org; members can update their own row
- **realtor_partners**: full CRUD scoped to `current_org_id()`
- **rate_limits**: no policy needed — only accessed via service-role client

### Step 4 — Create `lib/supabase/service.ts`

Service-role Supabase client. **Never import from client code.** Used only by public server actions that need to bypass RLS (intake submission, public brand lookup).

```typescript
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

**Note:** For DB writes from public actions, use the Drizzle client (`db` from `db/client.ts`) — it connects via `DATABASE_URL` which already has full access. The Supabase service client is for *Supabase-specific APIs* (Storage, Auth admin) — which we're not using in 2B since logo is a URL field. **Actually, we may not need this file in 2B at all.** Decide: if all public writes go through Drizzle, skip the file. If you build anything that needs Supabase SDK with elevated perms, create it.

**Recommendation:** skip `service.ts` for Phase 2B. All public writes go through Drizzle. Revisit when Storage upload is built in Phase 3.

### Step 5 — Build `app/actions/public.ts`

Public (unauthenticated) server actions for brand and LO lookups:

```typescript
"use server";

export async function getPublicBrand(): Promise<{
  organizationId: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  fontPreset: "SYSTEM" | "SERIF" | "ROUNDED";
  companyEmail: string | null;
  companyPhone: string | null;
} | null>

export async function getLoProfile(slug: string): Promise<{
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  slug: string;
} | null>
```

**Implementation notes:**
- `getPublicBrand()` fetches the single org (Phase 2B is single-tenant — just pick the first row)
- `getLoProfile(slug)` looks up a team member by slug within the single org
- Both use Drizzle directly. They do NOT call `getAuthContext()`.
- Cache with `unstable_cache` if you want, but not required.

### Step 6 — Build `app/actions/intake.ts`

Public intake submission + rate limiting + result lookup. Most complex file in 2B.

**Exports:**

```typescript
export async function submitIntake(input: IntakeInput): Promise<
  | { ok: true; leadId: string }
  | { ok: false; error: string }
>

export async function getPublicResult(leadId: string): Promise<PublicResult | null>
```

**`IntakeInput` shape** (from both short and long forms — long is superset):
- firstName, lastName, email, phone (required)
- creditRange, annualGrossIncome, monthlyDebtPayments, cashAvailable (required)
- employmentType (required)
- hasFiledTaxes, heavyWriteOffs (optional — only relevant for self-employed)
- targetPurchasePrice (optional — long form only)
- leadSource (required — defaults to WEBSITE_FORM)
- formLength: "short" | "long" (required, for analytics)
- referrerLoSlug (optional — from URL param)
- organizationId (required — passed from server component)

**Flow:**
1. Validate with Zod schema
2. Get client IP from headers (`x-forwarded-for`, fallback `x-real-ip`)
3. Check rate limit: upsert `rate_limits` row for `(key, current hour bucket)`, increment count, reject if > 5
4. Verify organizationId exists
5. Determine `assignedTo`:
   - If `referrerLoSlug` provided, look up that team member → use their displayName
   - Else look up org.defaultAssigneeId → use their displayName
   - Fallback: "Unassigned"
6. Build `LeadInputs` object → call `leadInputsToRow(inputs, organizationId)` → insert
7. Write `lead_events` row (`eventType: "intake_submitted"`, metadata includes formLength and referrer)
8. `console.log("[email stub] New lead submitted:", leadId, assignedTo)`
9. Return `{ ok: true, leadId }`

**`PublicResult` shape (sanitized — no $ amounts):**
```typescript
{
  firstName: string;
  readiness: "READY_NOW" | "NEARLY_READY" | "NOT_READY_YET";
  strongPillarCount: 0 | 1 | 2 | 3;
  pillarSummaries: {
    credit: { score: "strong" | "moderate" | "weak"; headline: string };
    income: { score: "strong" | "moderate" | "weak"; headline: string };
    cash:   { score: "strong" | "moderate" | "weak"; headline: string };
  };
  topRecommendation: { title: string; description: string } | null;
  // NO dollar amounts, NO detailed DTI percentages, NO loan path in buyer language
  // The `explanation` gets buyer-ified: replace "conventional or FHA" with "a traditional loan",
  //   replace "Non-QM" with "a specialty loan program", strip names.
  buyerExplanation: string;
  contact: {
    displayName: string;
    email: string;
    phone: string | null;
  };
}
```

**Implementation note for buyer-ification:** write a helper `buyerifyExplanation(explanation: string, decision: LeadDecision): string` that:
- Strips specific dollar amounts (regex: `\$[\d,]+`)
- Replaces jargon: "Non-QM" → "a specialty loan program", "QM" → "a traditional loan path", "conventional or FHA" → "a traditional loan", "FHA" → "a first-time-buyer-friendly program", "DTI" → "debt-to-income ratio"
- Replaces "qualify" → "be in position for" (safety net — shouldn't appear anyway)

### Step 7 — Build `components/intake/formOptions.ts`

Buyer-friendly dropdown labels. Separate from internal labels because buyers shouldn't see "SELF_EMPLOYED_FILED" or even the internal label "Self-Employed (Filed Taxes)" phrased that way.

```typescript
export const BUYER_CREDIT_OPTIONS = [
  { value: "740_PLUS", label: "Excellent (740+)" },
  { value: "680_739", label: "Very good (680–739)" },
  { value: "620_679", label: "Good (620–679)" },
  { value: "580_619", label: "Fair (580–619)" },
  { value: "BELOW_580", label: "Below 580 / not sure" },
] as const;

// Similar for income, cash, employment...
// Employment labels: "W-2 employee", "Self-employed", "Mix of both", "Retired"
// Map "Self-employed" in UI to follow-up questions (have you filed? write-offs?)
```

Also export `BUYER_LEAD_SOURCES` (Website, Referral, Social, Other).

### Step 8 — Build `components/intake/FormFields.tsx`

Reusable field primitives. Client component (`"use client"`). Export:

- `<TextField>` — label, name, type (text/email/tel), required, error
- `<SelectField>` — label, name, options array, required, error
- `<RadioGroup>` — label, name, options, required
- `<NumberField>` — label, name, min, step, required, error

Styling: neutral inputs — gray border, focus ring on brand color (read org primaryColor from CSS variable).

### Step 9 — Build `components/intake/ShortIntakeForm.tsx`

Client component. 8 fields, one screen:
1. First name + last name (side-by-side)
2. Email
3. Phone
4. Credit range (SELECT)
5. Employment type (SELECT — simplified: W-2, Self-employed, Mixed, Retired)
6. Annual gross income range (SELECT)
7. Cash available (SELECT)
8. Monthly debt payments (NUMBER, min=0)

**Props:** `{ organizationId: string; referrerLoSlug?: string; brandColors: {...} }`

**Behavior:**
- If employment = "Self-employed", show conditional: "Have you filed taxes?" (Yes/No radio)
- If YES → show "Do you have heavy write-offs?" (Yes/No radio)
- On submit: `useTransition` → `submitIntake(input)` → router.push(`/apply/result/${leadId}`)
- Show error state if action returns `ok: false`
- Disable submit button during pending

### Step 10 — Build `components/intake/LongIntakeForm.tsx`

2-step wizard. Step 1 = short form fields. Step 2 adds:
9. Target purchase price (NUMBER, optional)
10. Lead source (SELECT — Website, Referral, Social, Other)
11. Has co-borrower? (RADIO — not stored in 2B, used only to route message)
12. Timeline (SELECT — 0-3mo, 3-6mo, 6-12mo, exploring) — also not stored, just analytics
13. Anything else to share? (textarea → goes into `notes`)
14. Acknowledge disclaimer checkbox

Step 1 → Next button (client-side validation only)
Step 2 → Submit button (server action)

Same props as short form.

### Step 11 — Build `app/apply/layout.tsx`

Public layout with:
- Branding CSS variables injected inline from `getPublicBrand()`
- Font preset applied to `<body>` class
- Compliance disclaimer footer (always visible):
  > *This is an educational assessment, not a loan pre-approval or commitment to lend. Final loan decisions require a full application.*
- Minimal header: org logo (if set) + company name

**Must NOT be wrapped by the auth middleware redirect.** Verify `/apply` is in middleware's `PUBLIC_ROUTES`.

### Step 12 — Build `app/apply/page.tsx`

Landing page: "Quick check (2 min)" vs "Detailed (5 min)" choice. Two big buttons → `/apply/short` and `/apply/long`. Passes through `?lo=` query param.

### Step 13 — Build `app/apply/[slug]/page.tsx`

LO-specific landing. Same as `/apply/page.tsx` but:
- Call `getLoProfile(params.slug)` server-side
- If not found → `notFound()`
- Show LO name/photo/bio above the choice
- Both quick/detailed buttons pre-fill `?lo={slug}` so it propagates

### Step 14 — Build `app/apply/short/page.tsx` and `app/apply/long/page.tsx`

Server components that fetch brand, render the appropriate client form:

```tsx
export default async function ShortApplyPage({
  searchParams,
}: {
  searchParams: { lo?: string };
}) {
  const brand = await getPublicBrand();
  if (!brand) return notFound();
  return (
    <ShortIntakeForm
      organizationId={brand.organizationId}
      referrerLoSlug={searchParams.lo}
      brandColors={{
        primary: brand.primaryColor,
        secondary: brand.secondaryColor,
        accent: brand.accentColor,
      }}
    />
  );
}
```

### Step 15 — Build `app/apply/result/[id]/page.tsx`

Server component. Calls `getPublicResult(params.id)`. If null → notFound.

**Three visual treatments by readiness:**

**READY_NOW** — green accent:
- Heading: "You're in a strong position, {firstName}"
- Subhead: 3 pillar summaries as bulleted "strong/moderate/weak" indicators (badge style)
- Paragraph: `buyerExplanation`
- Next step: "Let's schedule a conversation." + contact card

**NEARLY_READY** — amber accent:
- Heading: "You're almost there, {firstName}"
- Subhead: pillar summaries
- Paragraph: `buyerExplanation`
- Top recommendation (if present): clear card with title + description
- "When you're ready, we're here." + contact card

**NOT_READY_YET** — neutral/gray:
- Heading: "Here's where you stand, {firstName}"
- Subhead: pillar summaries
- Paragraph: educational framing — "You're not yet ready to apply, and that's OK. Here's the highest-impact thing to work on."
- Top recommendation highlighted
- Smaller contact card at bottom: "Questions about your next steps? Reach out."

**Inline disclaimer** above the contact card on all three:
> *This is an educational assessment, not a loan pre-approval or commitment to lend. Final loan decisions require a full application.*

**Words that must NEVER appear on this page:** qualify, approved, pre-approved, guaranteed, "you don't qualify."

### Step 16 — Build `app/actions/settings.ts`

Authenticated admin-only server actions:

```typescript
export async function updateBranding(input: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  fontPreset: "SYSTEM" | "SERIF" | "ROUNDED";
  companyEmail: string | null;
  companyPhone: string | null;
  companyName: string;
})

export async function updateTeamMember(input: {
  memberId: string;
  displayName: string;
  phone: string | null;
  slug: string | null;
  bio: string | null;
  role: "admin" | "agent";
})

export async function setDefaultAssignee(memberId: string)
```

**Every action must:**
1. Call `getAuthContext()`
2. Check `auth.role === 'admin'` — return error if not
3. Validate with Zod
4. Constrain WHERE clause to `organization_id = auth.organizationId`
5. Revalidate relevant paths (`/settings/*`, `/apply`)

**Logo URL validation:** basic URL regex + `https://` required. Don't try to fetch/verify — accept what they give.

**Slug validation:** lowercase, alphanumeric + hyphens, 2-30 chars. Must be unique per org (catch the Postgres unique violation and return a friendly error).

### Step 17 — Build `app/settings/branding/page.tsx`

Admin-only server component. Redirect to `/` if not admin.

- Fetch current org
- Render a client `BrandingForm` with:
  - Three color pickers (native `<input type="color">`)
  - Logo URL text input
  - Font preset radio group (3 options with preview text for each)
  - Company name, email, phone text inputs
  - Live preview panel on the right showing a mock `/apply` landing page using the current form values
  - Save button → `updateBranding`
- Success toast on save

### Step 18 — Build `app/settings/team/page.tsx`

Admin-only. Fetch all team members for the org + current org's `defaultAssigneeId`. Render:

- Table/list of members with inline-edit for displayName, phone, slug, bio, role
- Default assignee dropdown (select from members) — saves via `setDefaultAssignee`
- For each member with a slug, show their public link:
  `https://your-domain.com/apply/{slug}`
  with a "Copy" button
- Red text warning next to slug field: "Changing this will break any shared links using the old slug."

### Step 19 — Update `components/TopBar.tsx`

Add a "Settings" link, visible only if user role is admin. Requires passing `role` from the dashboard page to TopBar (update prop type).

### Step 20 — Update `middleware.ts`

Add `/apply` to `PUBLIC_ROUTES`:
```typescript
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/apply"];
```

### Step 21 — Update `scripts/seed.ts`

- Seed the org with `name: "Cleared Home Lending"`, default branding colors, no logoUrl
- Seed the admin user with `slug: "admin"`, empty phone/bio
- After team_members insert, set `organizations.defaultAssigneeId = <admin member id>`
- Seed one realtor_partner as an example (optional — name it "Example Realtor" with slug "example")

### Step 22 — Update `README.md`

Replace the Phase 2A setup instructions with Phase 2B:
- Add the migration step: run `supabase/migrate-to-2b.sql` **before** `policies.sql` if upgrading
- Document how to reach `/apply` in dev (no login needed)
- Note that logo upload is Phase 3 — use a URL for now
- Phase checklist update

### Step 23 — Verify

```bash
cd homebuyer-clarity-engine
npm install
npx tsc --noEmit

# Production build with fake env so it can complete
DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" \
  NEXT_PUBLIC_SUPABASE_URL="https://fake.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="fake" \
  SUPABASE_SERVICE_ROLE_KEY="fake" \
  npx next build
```

**Both must pass cleanly.** If either fails, fix before declaring done.

---

## Architecture Patterns (Don't Deviate)

### Server Actions Over REST
All mutations go through `app/actions/*.ts` with `"use server"`. No `/api/*` routes unless strictly necessary.

### Authorization In Two Layers
1. **App layer:** `getAuthContext()` at the top of every authenticated action, filter queries by `organization_id`
2. **DB layer:** RLS policies enforce the same rule

### Public Vs Private Writes
- Authenticated: Drizzle client scoped via `getAuthContext()`
- Public intake: Drizzle client, but the action validates input with Zod, looks up org by ID passed from the server component, and rate-limits by IP

### Decision Engine Is Sacred
`lib/decision-engine.ts` is pure TypeScript — zero framework, DB, or auth deps. **Do not move side effects into it.**

### Row Mapping
DB = snake_case, TS = camelCase. `lib/row-mapper.ts` translates. Handles `hasFiledTaxes`/`heavyWriteOffs` as `"true"`/`"false"`/null text.

### Optimistic UI On Dashboard
Mutations use `useTransition`, update local state immediately, call server action, `router.refresh()`.

---

## CFO-Level Reminders (Push Back On These)

- Adding a UI component library — user said NO
- Skipping the `next build` step — a real bug was caught this way before
- Weakening the compliance disclaimer or guardrail language — needs compliance sign-off, not preference
- Multi-tenancy before there's a second tenant — don't overbuild
- Coupling the decision engine to framework code — architectural bet that keeps future phases cheap
- Implementing logo upload in 2B — user deferred to Phase 3 (URL field is sufficient for 2B)

---

## Fresh Supabase Setup (For New Dev Environment)

1. **Environment:** copy `.env.example` → `.env.local`, fill from Supabase dashboard
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API, secret)
   - `DATABASE_URL` (Settings → Database → Session pooler URI, port 5432)

2. **Schema:** `npm install && npm run db:push`

3. **RLS:** paste `supabase/policies.sql` into Supabase SQL Editor → Run

4. **Create user:** Supabase Dashboard → Authentication → Users → Add user → auto-confirm YES → copy UUID

5. **Seed:**
   ```bash
   SEED_USER_ID="<uuid>" \
   SEED_USER_EMAIL="you@example.com" \
   SEED_USER_NAME="Your Name" \
   npm run db:seed
   ```

6. **Run:** `npm run dev`

## Upgrading From Phase 2A To Phase 2B

1. Pull new code
2. Paste `supabase/migrate-to-2b.sql` into Supabase SQL Editor → Run (idempotent)
3. Paste updated `supabase/policies.sql` → Run
4. `npm install` (no new deps, but safe)
5. `npm run dev`

---

## Parking Lot (Phase 3+)

1. Logo upload to Supabase Storage
2. Realtor partner UI (schema exists)
3. Round-robin assignment (replace single default assignee)
4. Transactional email via Resend
5. CAPTCHA if bot submissions become a problem
6. Self-serve password reset
7. Inline lead editing (shared components with intake form)
8. Archived leads toggle in dashboard
9. Multi-tenancy (subdomain routing in middleware)

---

## Handoff Checklist (For Next Session)

- [ ] Read this entire document
- [ ] Confirm starting state — read `lib/decision-engine.ts`, `lib/types.ts`, `db/schema.ts`, `app/actions/leads.ts`
- [ ] Run `npm install && npx tsc --noEmit` to verify Phase 2A baseline passes
- [ ] Execute Steps 1–23 in order
- [ ] Build → type-check → production build IN THAT ORDER before declaring done
- [ ] Final status report: what shipped, what the user needs to test, what's next

Good luck.
