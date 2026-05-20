# Credit range — safe migration plan

This document describes how to change credit buckets, UI copy, and decision-engine thresholds **without** breaking existing `leads` rows or the PostgreSQL `credit_range` enum.

## Principles

1. **Canonical values** — The decision engine (`lib/decision-engine.ts`) only receives values in the `CreditRange` union in `lib/types.ts`, after **normalization**.
2. **Legacy support** — Add `old_label → canonical_label` entries in `LEGACY_TO_CANONICAL` in `lib/credit-range-normalize.ts`. Never remove a legacy key from the map until the database has **zero** rows using that label.
3. **Read path** — `rowToLead` in `lib/row-mapper.ts` calls `normalizeCreditRange(String(row.creditRange))` so any stored string (canonical or legacy) becomes a canonical `CreditRange` before scoring and UI.
4. **Write path** — `leadInputsToRow` normalizes before `evaluateLead` and persists the **canonical** token on insert/update (once application code is deployed).
5. **UI labels ≠ stored tokens** — Prefer changing buyer-facing copy in `components/intake/formOptions.ts` (`BUYER_CREDIT_OPTIONS`) and staff labels in `CREDIT_RANGE_LABELS` (`lib/types.ts`) without renaming enums when possible.
6. **Decision logic last** — Adjust `creditMidpoint`, thresholds, and copy inside `lib/decision-engine.ts` **after** legacy→canonical mapping is defined and tested on copies of production data (or staging).

## Recommended phases

### Phase A — Deploy normalization (no enum change)

- Ship `lib/credit-range-normalize.ts` (already present) with `LEGACY_TO_CANONICAL` empty except for any aliases you already know.
- Wire `row-mapper` (already done).
- **Outcome:** Existing rows keep their DB values; reads always score using canonical buckets.

### Phase B — Optional UI-only changes

- Update labels in `BUYER_CREDIT_OPTIONS` / `CREDIT_RANGE_LABELS` only.
- **Outcome:** No migration; stored enum strings unchanged.

### Phase C — Introduce new canonical enum values (application + DB)

When you **must** add or rename stored tokens:

1. **Postgres** — Use `ALTER TYPE ... ADD VALUE` for additive changes. Avoid dropping or renaming enum values until backfill is complete (see Phase D).
2. **`db/schema.ts`** — Extend `creditRangeEnum` to match Postgres.
3. **`lib/types.ts`** — Extend `CreditRange`.
4. **`lib/credit-range-normalize.ts`** — Extend `CREDIT_RANGE_CANONICAL_VALUES` and map every **retired** label in `LEGACY_TO_CANONICAL`.
5. **Zod** — Update `creditRange` enums in `app/actions/intake.ts` and `app/actions/leads.ts` to accept **new** intake values; optionally use `.transform(normalizeCreditRange)` so old API payloads still work during rollout.
6. **Intake UI** — Update `formOptions.ts` option `value`s only when you intentionally issue new tokens from the browser.

### Phase D — Backfill + retire old labels (optional)

1. Run SQL `UPDATE leads SET credit_range = '<canonical>' WHERE credit_range = '<legacy>'` per mapping row (in a transaction; verify counts).
2. Verify `SELECT DISTINCT credit_range FROM leads` only shows canonical values (plus any intentional coexistence window).
3. Only then consider removing unused enum labels (often requires recreating the enum or a multi-step migration — plan with Postgres docs / Supabase guidance).

### Phase E — Decision engine

- After Phase A–C are stable, adjust `creditMidpoint`, `scoreCredit` breakpoints, cash rules, loan path, and readiness blockers in `lib/decision-engine.ts`.
- Re-save or batch-recompute `decision` JSON if you need historical leads to reflect new logic (your product choice).

## Rollback

- Revert application deploy; legacy strings remain in DB.
- Keep `LEGACY_TO_CANONICAL` entries for any label ever written so old deploys or replicas cannot mis-read data.

## Saved leads and breaking changes

- **Renaming only labels (Phase B):** Safe.
- **Adding legacy mappings (Phase A/C):** Safe if every stored variant maps to exactly one canonical value.
- **Dropping enum values from Postgres without backfill:** Can break reads/writes — avoid until Phase D is done.

## Files checklist

| Concern | Files |
|--------|--------|
| Normalize | `lib/credit-range-normalize.ts` |
| DB read/write path | `lib/row-mapper.ts` |
| Types / labels | `lib/types.ts` (`CreditRange`, `CREDIT_RANGE_LABELS`) |
| Buyer dropdown | `components/intake/formOptions.ts` |
| Validation | `app/actions/intake.ts`, `app/actions/leads.ts` |
| Drizzle / PG enum | `db/schema.ts`, migration SQL |
| Scoring | `lib/decision-engine.ts` (last) |
| Seeds | `lib/mock-data.ts`, `scripts/seed.ts` |

## Example SQL sketch (run only after you define mappings)

```sql
-- Example: map a retired label to a canonical one (adjust names to your plan).
-- BEGIN;
-- UPDATE leads SET credit_range = '620_679' WHERE credit_range = 'LEGACY_EXAMPLE';
-- COMMIT;
```

Do not run destructive `ALTER TYPE ... DROP` until no rows reference old labels.
