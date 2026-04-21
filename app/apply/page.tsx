// =============================================================================
// Public /apply landing — short vs long intake (Phase 2B — Step 12).
// Preserves ?lo= for LO attribution on downstream form routes.
// =============================================================================

import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = { lo?: string | string[] };

function firstLo(searchParams: SearchParams): string | undefined {
  const raw = searchParams.lo;
  if (Array.isArray(raw)) return raw[0]?.trim() || undefined;
  return raw?.trim() || undefined;
}

export default function ApplyLandingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const lo = firstLo(searchParams);
  const loQuery = lo ? `?lo=${encodeURIComponent(lo)}` : "";

  return (
    <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900 tracking-tight">
        How would you like to check your position?
      </h1>
      <p className="mt-2 text-sm text-surface-600 leading-relaxed">
        This is a quick, educational snapshot — not a loan decision. Choose the
        path that fits your time right now.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <Link
          href={`/apply/short${loQuery}`}
          className="block w-full rounded-lg border-2 border-surface-200 bg-white px-5 py-5 text-left shadow-sm transition hover:border-[color:var(--brand-primary,#1e40af)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--intake-brand,#1e40af)]"
        >
          <span className="block text-lg font-semibold text-surface-900">
            Quick check
          </span>
          <span className="mt-1 block text-sm text-surface-600">
            About 2 minutes · fewer questions
          </span>
        </Link>

        <Link
          href={`/apply/long${loQuery}`}
          className="block w-full rounded-lg border-2 border-surface-200 bg-white px-5 py-5 text-left shadow-sm transition hover:border-[color:var(--brand-primary,#1e40af)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--intake-brand,#1e40af)]"
        >
          <span className="block text-lg font-semibold text-surface-900">
            Detailed snapshot
          </span>
          <span className="mt-1 block text-sm text-surface-600">
            About 5 minutes · a bit more context
          </span>
        </Link>
      </div>
    </div>
  );
}
