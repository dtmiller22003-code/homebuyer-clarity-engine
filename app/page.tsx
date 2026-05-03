// =============================================================================
// Dashboard page — Server Component.
// Fetches leads from the DB and passes them to the client component
// that handles filtering, selection, and actions.
// =============================================================================

import { redirect } from "next/navigation";
import { listLeads } from "@/app/actions/leads";
import { isRealtorPartnerRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (isRealtorPartnerRole(auth.role)) {
    redirect("/realtor");
  }

  const leads = await listLeads();

  return (
    <DashboardClient
      initialLeads={leads}
      currentUser={{
        displayName: auth.displayName,
        email: auth.email,
        role: auth.role,
      }}
    />
  );
}
