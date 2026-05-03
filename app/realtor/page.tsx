import { redirect } from "next/navigation";
import { listLeads } from "@/app/actions/leads";
import { isRealtorPartnerRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";
import { RealtorDashboardClient } from "@/components/RealtorDashboardClient";

export default async function RealtorDashboardPage() {
  const auth = await getAuthContext();
  if (!isRealtorPartnerRole(auth.role)) {
    redirect("/");
  }

  const leads = await listLeads();

  return (
    <RealtorDashboardClient
      leads={leads}
      currentUser={{
        displayName: auth.displayName,
        email: auth.email,
        role: auth.role,
      }}
    />
  );
}
