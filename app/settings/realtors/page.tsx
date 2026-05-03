import { redirect } from "next/navigation";
import { getRealtorPartnerPerformanceAdmin } from "@/app/actions/realtor-performance";
import { RealtorsAdminClient } from "@/app/settings/realtors/RealtorsAdminClient";
import { isAdminRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function RealtorsSettingsPage() {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) {
    redirect("/");
  }

  const { rows, leaderboards } = await getRealtorPartnerPerformanceAdmin();

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Realtor partners</h1>
        <p className="text-sm text-surface-600 mt-1">
          Create a partner to add their record, send a Supabase invite to their
          email, and attach their{" "}
          <code className="text-xs bg-surface-100 px-1 rounded">realtor_partner</code>{" "}
          team login automatically. They sign in with the magic link and only see
          leads attributed to them. Requires{" "}
          <code className="text-xs bg-surface-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          on the server (never exposed to the browser).
        </p>
      </div>

      <RealtorsAdminClient initialRows={rows} leaderboards={leaderboards} />
    </div>
  );
}
