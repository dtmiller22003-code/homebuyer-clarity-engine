// =============================================================================
// Dashboard page — Server Component.
// Fetches leads from the DB and passes them to the client component
// that handles filtering, selection, and actions.
// =============================================================================

import { listLeads } from "@/app/actions/leads";
import { getAuthContext } from "@/lib/supabase/auth";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const [leads, auth] = await Promise.all([listLeads(), getAuthContext()]);

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
