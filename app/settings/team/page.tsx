import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { InviteLoanOfficerForm } from "@/app/settings/team/InviteLoanOfficerForm";
import {
  LoanOfficerTableRow,
  TeamLoanOfficersClient,
} from "@/app/settings/team/TeamLoanOfficersClient";
import { TeamSettingsClient } from "@/app/settings/team/TeamSettingsClient";
import { db } from "@/db/client";
import { organizations, teamMembers } from "@/db/schema";
import { isAdminRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function TeamSettingsPage() {
  const auth = await getAuthContext();
  if (!isAdminRole(auth.role)) {
    redirect("/");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, auth.organizationId))
    .limit(1);

  if (!org) {
    redirect("/");
  }

  const members = await db
    .select({
      id: teamMembers.id,
      displayName: teamMembers.displayName,
      email: teamMembers.email,
      phone: teamMembers.phone,
      slug: teamMembers.slug,
      bio: teamMembers.bio,
      role: teamMembers.role,
      applicationLink: teamMembers.applicationLink,
    })
    .from(teamMembers)
    .where(eq(teamMembers.organizationId, auth.organizationId));

  const normalizedMembers = members
    .filter(
      (m): m is typeof m & { role: "admin" | "agent" | "loan_officer" } =>
        m.role === "admin" ||
        m.role === "agent" ||
        m.role === "loan_officer",
    )
    .map((m) => ({
      ...m,
      applicationLink: m.applicationLink ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  if (normalizedMembers.length === 0) {
    redirect("/");
  }

  const defaultAssigneeId =
    org.defaultAssigneeId &&
    normalizedMembers.some((m) => m.id === org.defaultAssigneeId)
      ? org.defaultAssigneeId
      : normalizedMembers[0].id;

  const loanOfficers: LoanOfficerTableRow[] = normalizedMembers
    .filter(
      (m) => m.role === "loan_officer" || m.role === "agent",
    )
    .map((m) => ({
      id: m.id,
      displayName: m.displayName,
      email: m.email,
      slug: m.slug,
      applicationLink: m.applicationLink,
    }));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Team</h1>
        <p className="text-sm text-surface-600 mt-1">
          Invite loan officers (Supabase Auth + team row + public{" "}
          <code className="text-xs bg-surface-100 px-1 rounded">/apply/lo/…</code> link), or
          edit existing profiles below.
        </p>
      </div>

      <div className="space-y-8">
        <InviteLoanOfficerForm />
        <TeamLoanOfficersClient initialLoanOfficers={loanOfficers} />
      </div>

      <TeamSettingsClient
        members={normalizedMembers}
        defaultAssigneeId={defaultAssigneeId}
      />
    </div>
  );
}
