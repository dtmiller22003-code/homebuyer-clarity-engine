import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { RealtorBrandingClient } from "@/app/realtor/branding/RealtorBrandingClient";
import { TopBar } from "@/components/TopBar";
import { db } from "@/db/client";
import { realtorPartners } from "@/db/schema";
import { isRealtorPartnerRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function RealtorBrandingPage() {
  const auth = await getAuthContext();
  if (!isRealtorPartnerRole(auth.role) || !auth.realtorPartnerId) {
    redirect("/");
  }

  const [partner] = await db
    .select()
    .from(realtorPartners)
    .where(eq(realtorPartners.id, auth.realtorPartnerId))
    .limit(1);

  if (!partner) {
    redirect("/realtor");
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <TopBar
        user={{
          displayName: auth.displayName,
          email: auth.email,
          role: auth.role,
        }}
      />
      <div className="p-6">
        <RealtorBrandingClient
          partnerId={partner.id}
          initial={{
            personalLogoUrl: partner.personalLogoUrl,
            subtitle: partner.subtitle,
            defaultApplicationLink: partner.defaultApplicationLink,
          }}
        />
      </div>
    </div>
  );
}
