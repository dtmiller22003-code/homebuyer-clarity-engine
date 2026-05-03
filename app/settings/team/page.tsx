import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TeamSettingsClient } from "@/app/settings/team/TeamSettingsClient";
import { db } from "@/db/client";
import { organizations, teamMembers } from "@/db/schema";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function TeamSettingsPage() {
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
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
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  if (normalizedMembers.length === 0) {
    redirect("/");
  }

  const defaultAssigneeId =
    org.defaultAssigneeId &&
    normalizedMembers.some((m) => m.id === org.defaultAssigneeId)
      ? org.defaultAssigneeId
      : normalizedMembers[0].id;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Team</h1>
        <p className="text-sm text-surface-600 mt-1">
          Manage LO public profiles, slugs, and default assignment.
        </p>
      </div>

      <TeamSettingsClient
        members={normalizedMembers}
        defaultAssigneeId={defaultAssigneeId}
      />
    </div>
  );
}
