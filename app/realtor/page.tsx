import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { listLeads } from "@/app/actions/leads";
import { db } from "@/db/client";
import { realtorPartners } from "@/db/schema";
import { isRealtorPartnerRole } from "@/lib/auth-roles";
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

  if (auth.realtorPartnerId) {
    const [rp] = await db
      .select({
        displayName: realtorPartners.displayName,
        personalLogoUrl: realtorPartners.personalLogoUrl,
        subtitle: realtorPartners.subtitle,
      })
      .from(realtorPartners)
      .where(eq(realtorPartners.id, auth.realtorPartnerId))
      .limit(1);
    if (rp) partnerBranding = rp;
  }

  return (
    <RealtorDashboardClient
      leads={leads}
      partnerBranding={partnerBranding}
      currentUser={{
        displayName: auth.displayName,
        email: auth.email,
        role: auth.role,
      }}
    />
  );
}
