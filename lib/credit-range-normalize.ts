// =============================================================================
// Credit range — canonical values vs legacy DB / historical strings.
//
// - `CreditRange` in lib/types.ts is the canonical set the decision engine uses.
// - Postgres may still store retired enum labels until a backfill completes.
// - Add legacy keys → canonical values in LEGACY_TO_CANONICAL only (never remove
//   old keys from the map until there are zero rows using them).
//
// UI labels live in lib/types.ts (CREDIT_RANGE_LABELS) and
// components/intake/formOptions.ts (BUYER_CREDIT_OPTIONS) — change wording there
// without touching stored enum tokens when possible.
// =============================================================================

import type { CreditRange } from "./types";

/** Every value the decision engine and public intake are allowed to emit today. */
export const CREDIT_RANGE_CANONICAL_VALUES = [
  "BELOW_580",
  "580_619",
  "620_679",
  "680_739",
  "740_PLUS",
] as const satisfies readonly CreditRange[];

const CANONICAL_SET = new Set<string>(CREDIT_RANGE_CANONICAL_VALUES);

/**
 * Maps retired `credit_range` enum strings (or other historical tokens) to the
 * current canonical bucket. Only add entries when you introduce a new canonical
 * name and still have rows using the old label.
 *
 * Example (future):
 *   OLD_BUCKET: "620_679",
 */
export const LEGACY_TO_CANONICAL: Partial<Record<string, CreditRange>> = {
  // Identity is handled by CANONICAL_SET — list only legacy aliases here.
};

/**
 * Normalize any stored / inbound credit range string to a canonical `CreditRange`
 * before scoring, display via CREDIT_RANGE_LABELS, or persistence.
 *
 * Unknown strings fall back to `BELOW_580` so scoring stays deterministic; add a
 * legacy mapping instead of relying on the fallback for real production values.
 */
export function normalizeCreditRange(raw: string): CreditRange {
  const trimmed = raw.trim();
  if (CANONICAL_SET.has(trimmed)) {
    return trimmed as CreditRange;
  }
  const mapped = LEGACY_TO_CANONICAL[trimmed];
  if (mapped !== undefined) {
    return mapped;
  }
  return "BELOW_580";
}

export function isCanonicalCreditRange(value: string): value is CreditRange {
  return CANONICAL_SET.has(value.trim());
}
