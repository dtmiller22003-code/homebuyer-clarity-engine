// =============================================================================
// LO-specific /apply/[slug] landing (Phase 2B — Step 13).
// =============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLoProfile } from "@/app/actions/public";

type PageParams = { slug: string };

export default async function ApplyLoLandingPage({
  params,
}: {
  params: PageParams;
}) {
  const profile = await getLoProfile(params.slug);
  if (!profile) {
    notFound();
  }

  const loQuery = `?lo=${encodeURIComponent(profile.slug)}`;

  return (
    <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">
      <div className="rounded-lg border border-surface-200 bg-white p-5 shadow-sm mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-surface-500">
          You&apos;re connecting with
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-surface-900 tracking-tight">
          {profile.displayName}
        </h1>
        {profile.bio ? (
          <p className="mt-3 text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-1 text-sm text-surface-600">
          <a
            className="text-[color:var(--brand-primary,#1e40af)] hover:underline"
            href={`mailto:${profile.email}`}
          >
            {profile.email}
          </a>
          {profile.phone ? (
            <a
              className="text-[color:var(--brand-primary,#1e40af)] hover:underline"
              href={`tel:${profile.phone.replace(/\s/g, "")}`}
            >
              {profile.phone}
            </a>
          ) : null}
        </div>
      </div>

      <h2 className="text-xl font-semibold text-surface-900 tracking-tight">
        How would you like to check your position?
      </h2>
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
