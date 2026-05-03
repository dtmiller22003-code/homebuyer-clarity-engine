// =============================================================================
// Dashboard page — Server Component.
// Fetches leads from the DB and passes them to the client component
// that handles filtering, selection, and actions.
// =============================================================================

import { redirect } from "next/navigation";
import { getRealtorPartnerPerformanceAdmin } from "@/app/actions/realtor-performance";
import { listLeads } from "@/app/actions/leads";
import { isAdminRole, isRealtorPartnerRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (isRealtorPartnerRole(auth.role)) {
    redirect("/realtor");
  }

  const [leads, realtorPerf] = await Promise.all([
    listLeads(),
    isAdminRole(auth.role) ? getRealtorPartnerPerformanceAdmin() : null,
  ]);

  return (
    <DashboardClient
      initialLeads={leads}
      currentUser={{
        displayName: auth.displayName,
        email: auth.email,
        role: auth.role,
      }}
      realtorLeaderboards={realtorPerf?.leaderboards ?? null}
    />
  );
}
