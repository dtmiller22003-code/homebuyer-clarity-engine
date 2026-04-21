// =============================================================================
// Public long intake route (Phase 2B — Step 14).
// =============================================================================

import { getApplyBranding } from "@/app/apply/getApplyBranding";
import { LongIntakeForm } from "@/components/intake/LongIntakeForm";

export const dynamic = "force-dynamic";

type SearchParams = { lo?: string | string[] };

function firstLo(searchParams: SearchParams): string | undefined {
  const raw = searchParams.lo;
  if (Array.isArray(raw)) return raw[0]?.trim() || undefined;
  return raw?.trim() || undefined;
}

export default async function LongApplyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const brand = await getApplyBranding();

  const referrerLoSlug = firstLo(searchParams);

  return (
    <div className="py-6 sm:py-8">
      <LongIntakeForm
        organizationId={brand.organizationId}
        referrerLoSlug={referrerLoSlug}
        brandColors={{
          primary: brand.primaryColor,
          secondary: brand.secondaryColor,
          accent: brand.accentColor,
        }}
      />
    </div>
  );
}
