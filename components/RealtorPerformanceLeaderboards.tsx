"use client";

import type { RealtorLeaderboardSnapshot } from "@/app/actions/realtor-performance";

export function RealtorPerformanceLeaderboards({
  data,
  headingClassName = "text-xs font-semibold text-surface-500 uppercase tracking-wide",
}: {
  data: RealtorLeaderboardSnapshot;
  headingClassName?: string;
}) {
  const hasMonth = data.topThisMonth.length > 0;
  const hasConv = data.topConverters.length > 0;
  if (!hasMonth && !hasConv) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {hasMonth ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50/80 p-4">
          <h3 className={headingClassName}>Top realtors this month</h3>
          <ol className="mt-3 space-y-2 text-sm text-surface-800">
            {data.topThisMonth.map((e, i) => (
              <li key={e.partnerId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  <span className="text-surface-500 font-medium tabular-nums mr-2">
                    {i + 1}.
                  </span>
                  {e.displayName}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {e.leadCount} lead{e.leadCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {hasConv ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50/80 p-4">
          <h3 className={headingClassName}>Top converters</h3>
          <ol className="mt-3 space-y-2 text-sm text-surface-800">
            {data.topConverters.map((e, i) => (
              <li key={e.partnerId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  <span className="text-surface-500 font-medium tabular-nums mr-2">
                    {i + 1}.
                  </span>
                  {e.displayName}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {e.conversionRatePercent}%
                  <span className="text-surface-500 font-normal text-xs ml-1">
                    ({e.totalLeads} total)
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
