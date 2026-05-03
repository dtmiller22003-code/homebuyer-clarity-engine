// =============================================================================
// Authentication helper — resolves the current Supabase user and their
// team member record in our DB. Throws if unauthenticated.
//
// Use at the top of every server action / protected server component.
// =============================================================================

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { realtorPartners, teamMembers } from "@/db/schema";
import { normalizeStaffRole } from "@/lib/auth-roles";
import { createClient } from "./server";

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  /** Raw DB value: `admin`, `loan_officer`, legacy `agent`, or `realtor_partner`. */
  role: string;
  /** Set when `role` is `realtor_partner` — ties the user to `leads.realtor_partner_id`. */
  realtorPartnerId: string | null;
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find their team_members row
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (!member) {
    // User exists in Supabase auth but not in our team_members table.
    // This means they were never invited/provisioned. Send them to an error page.
    redirect("/login?error=not_provisioned");
  }

  if (member.role === "realtor_partner" && member.realtorPartnerId) {
    const [partner] = await db
      .select({
        isActive: realtorPartners.isActive,
        deletedAt: realtorPartners.deletedAt,
      })
      .from(realtorPartners)
      .where(
        and(
          eq(realtorPartners.id, member.realtorPartnerId),
          isNull(realtorPartners.deletedAt),
        ),
      )
      .limit(1);

    if (!partner || !partner.isActive) {
      redirect("/login?error=realtor_inactive");
    }
  }

  return {
    userId: user.id,
    email: user.email ?? member.email,
    displayName: member.displayName,
    organizationId: member.organizationId,
    role: normalizeStaffRole(member.role),
    realtorPartnerId: member.realtorPartnerId ?? null,
  };
}
