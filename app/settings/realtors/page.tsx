import { redirect } from "next/navigation";
import { listRealtorPartnersAdmin } from "@/app/actions/realtors";
import { RealtorsAdminClient } from "@/app/settings/realtors/RealtorsAdminClient";
import { isAdminRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function RealtorsSettingsPage() {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) {
    redirect("/");
  }

  const partners = await listRealtorPartnersAdmin();

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Realtor partners</h1>
        <p className="text-sm text-surface-600 mt-1">
          Create partners and share their personal apply links. Leads from those
          links are attributed to the partner. Provision realtor logins in
          Supabase Auth and set team member role to{" "}
          <code className="text-xs bg-surface-100 px-1 rounded">realtor_partner</code>{" "}
          with the matching partner id.
        </p>
      </div>

      <RealtorsAdminClient initialPartners={partners} />
    </div>
  );
}
