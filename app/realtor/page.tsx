import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { listLeads } from "@/app/actions/leads";
import { db } from "@/db/client";
import { realtorPartners } from "@/db/schema";
import { isRealtorPartnerRole } from "@/lib/auth-roles";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { getAuthContext } from "@/lib/supabase/auth";
import { RealtorDashboardClient } from "@/components/RealtorDashboardClient";

export default async function RealtorDashboardPage() {
  const auth = await getAuthContext();
  if (!isRealtorPartnerRole(auth.role)) {
    redirect("/");
  }

  const leads = await listLeads();

  let partnerBranding: {
    displayName: string;
    personalLogoUrl: string | null;
    subtitle: string | null;
  } | null = null;

  let partnerSlug: string | null = null;
  if (auth.realtorPartnerId) {
    const [rp] = await db
      .select({
        slug: realtorPartners.slug,
        displayName: realtorPartners.displayName,
        personalLogoUrl: realtorPartners.personalLogoUrl,
        subtitle: realtorPartners.subtitle,
      })
      .from(realtorPartners)
      .where(eq(realtorPartners.id, auth.realtorPartnerId))
      .limit(1);
    if (rp) {
      partnerSlug = rp.slug?.trim() || null;
      partnerBranding = {
        displayName: rp.displayName,
        personalLogoUrl: rp.personalLogoUrl,
        subtitle: rp.subtitle,
      };
    }
  }

  const origin = getPublicSiteOrigin();
  const partnerLeadLink =
    origin && partnerSlug
      ? `${origin}/apply/realtor/${encodeURIComponent(partnerSlug)}`
      : null;

  return (
    <RealtorDashboardClient
      leads={leads}
      partnerBranding={partnerBranding}
      partnerLeadLink={partnerLeadLink}
      partnerLeadLinkUnavailableHint={
        !origin
          ? "Add NEXT_PUBLIC_SITE_URL (or deploy on Vercel) so your lead link can be shown."
          : "Your public link slug is not set. Contact your admin."
      }
      currentUser={{
        displayName: auth.displayName,
        email: auth.email,
        role: auth.role,
      }}
    />
  );
}
