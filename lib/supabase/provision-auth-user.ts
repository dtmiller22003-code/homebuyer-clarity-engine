// =============================================================================
// Invite / resolve Supabase Auth users for admin provisioning (service role).
// Server-only. Never import from client components.
// =============================================================================

import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  for (let round = 0; round < 50; round++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

export type ProvisionAuthUserResult =
  | { ok: true; userId: string; invitationSent: boolean }
  | { ok: false; error: string };

/**
 * Ensures a Supabase Auth user exists for the email and sends an invite email
 * when the user is newly created. If the user already exists, returns their id
 * without failing (no duplicate invite error surfaced to the admin).
 */
export async function ensureAuthUserForEmail(options: {
  email: string;
  displayName: string;
}): Promise<ProvisionAuthUserResult> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY). Add it to provision users from the admin UI.",
    };
  }

  const email = options.email.trim();
  if (!email) {
    return { ok: false, error: "Email is required." };
  }

  const existing = await findAuthUserByEmail(admin, email);
  if (existing) {
    return { ok: true, userId: existing.id, invitationSent: false };
  }

  const origin = getPublicSiteOrigin() ?? undefined;
  const redirectTo = origin ? `${origin}/login` : undefined;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: options.displayName.trim() },
    redirectTo,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered") ||
      msg.includes("user already exists") ||
      msg.includes("duplicate")
    ) {
      const again = await findAuthUserByEmail(admin, email);
      if (again) {
        return { ok: true, userId: again.id, invitationSent: false };
      }
    }
    return { ok: false, error: error.message || "Could not invite user." };
  }

  if (!data?.user?.id) {
    return { ok: false, error: "Invite did not return a user id." };
  }

  return { ok: true, userId: data.user.id, invitationSent: true };
}

export async function deleteAuthUserById(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, error: error.message || "Could not delete auth user." };
  }
  return { ok: true };
}
