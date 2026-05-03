// =============================================================================
// Public short intake route (Phase 2B — Step 14).
// =============================================================================

import { getApplyBranding } from "@/app/apply/getApplyBranding";
import { ShortIntakeForm } from "@/components/intake/ShortIntakeForm";

export const dynamic = "force-dynamic";

type SearchParams = { lo?: string | string[]; partner?: string | string[] };

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return value?.trim() || undefined;
}

export default async function ShortApplyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const brand = await getApplyBranding();

  const referrerLoSlug = firstParam(searchParams.lo);
  const realtorPartnerSlug = firstParam(searchParams.partner);

  return (
    <div className="py-6 sm:py-8">
      <ShortIntakeForm
        organizationId={brand.organizationId}
        referrerLoSlug={referrerLoSlug}
        realtorPartnerSlug={realtorPartnerSlug}
        brandColors={{
          primary: brand.primaryColor,
          secondary: brand.secondaryColor,
          accent: brand.accentColor,
        }}
      />
    </div>
  );
}
