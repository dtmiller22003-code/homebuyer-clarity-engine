# Homebuyer Clarity Engine

Internal lead dashboard and buyer-facing intake (Phase 2B in progress). Stack: **Next.js 14 (App Router)**, **TypeScript**, **Tailwind**, **Supabase Auth**, **Drizzle**, **Postgres** (Supabase).

## Environment

Copy `.env.example` to `.env.local` (if present) or create `.env.local` with:

- `DATABASE_URL` — Supabase **Session pooler** URI (port 5432)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Settings → API
- `NEXT_PUBLIC_SITE_URL` — app origin for password-reset emails (e.g. `https://homebuyer-clarity-engine.vercel.app`; use `http://localhost:3000` locally)
- `SUPABASE_SERVICE_ROLE_KEY` — optional for future elevated Supabase APIs (not required for Phase 2B intake via Drizzle)

## Fresh database

1. `npm install`
2. `npm run db:push` — push Drizzle schema to Postgres
3. In Supabase SQL Editor, run **`supabase/policies.sql`** (RLS)
4. Create an Auth user (confirmed), then seed:

```bash
SEED_USER_ID="<uuid>" SEED_USER_EMAIL="you@example.com" SEED_USER_NAME="Your Name" npm run db:seed
```

5. `npm run dev` — dashboard at `/`, login at `/login`

## Upgrading from Phase 2A to Phase 2B

1. Pull latest code
2. Run **`supabase/migrate-to-2b.sql`** in the SQL Editor (idempotent; safe to run twice)
3. Run the updated **`supabase/policies.sql`**
4. Re-seed or adjust org/team data as needed; seed script targets **Cleared Home Lending** and an admin member with slug `admin`

## Public `/apply` routes

- `/apply` is public (no login). Ensure middleware includes `/apply` in public routes (already configured).
- Logo on buyer pages is a **URL field** in Phase 2B; file upload is deferred to Phase 3.

## Scripts

| Command        | Purpose              |
| -------------- | -------------------- |
| `npm run dev`  | Next.js dev server   |
| `npm run build`| Production build     |
| `npm run db:push` | Drizzle → DB      |
| `npm run db:seed` | Seed org + leads |

## Verify

```bash
npx tsc --noEmit
```

For `npm run build` without a real DB, set placeholder env (see `docs/HANDOFF-2B-CORRECTED.md` Step 23) so `DATABASE_URL` exists during the build.
