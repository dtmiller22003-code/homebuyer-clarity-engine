// =============================================================================
// Dashboard page — Server Component.
// Fetches leads from the DB and passes them to the client component
// that handles filtering, selection, and actions.
// =============================================================================

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getRealtorPartnerPerformanceAdmin } from "@/app/actions/realtor-performance";
import { listLeads } from "@/app/actions/leads";
import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";
import { isAdminRole, isRealtorPartnerRole, normalizeStaffRole } from "@/lib/auth-roles";
import { getPublicSiteOrigin } from "@/lib/site-url";
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

  let loanOfficerApplyLinkUrl: string | null | undefined = undefined;
  let loanOfficerApplyLinkUnavailableHint: string | undefined = undefined;
  if (normalizeStaffRole(auth.role) === "loan_officer") {
    const [memberRow] = await db
      .select({ slug: teamMembers.slug })
      .from(teamMembers)
      .where(eq(teamMembers.userId, auth.userId))
      .limit(1);
    const origin = getPublicSiteOrigin();
    const slug = memberRow?.slug?.trim();
    if (origin && slug) {
      loanOfficerApplyLinkUrl = `${origin}/apply/lo/${encodeURIComponent(slug)}`;
    } else {
      loanOfficerApplyLinkUrl = null;
      loanOfficerApplyLinkUnavailableHint = !origin
        ? "Add NEXT_PUBLIC_SITE_URL (or deploy on Vercel) so your lead link can be shown."
        : "Ask your admin to set your public link slug in team settings.";
    }
  }

  return (
    <DashboardClient
      initialLeads={leads}
      currentUser={{
        displayName: auth.displayName,
        email: auth.email,
        role: auth.role,
      }}
      realtorLeaderboards={realtorPerf?.leaderboards ?? null}
      loanOfficerApplyLinkUrl={loanOfficerApplyLinkUrl}
      loanOfficerApplyLinkUnavailableHint={loanOfficerApplyLinkUnavailableHint}
    />
  );
}
