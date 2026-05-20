"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().email("Please enter a valid email address.");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true }> {
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) {
    return { ok: true };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    console.error(
      "requestPasswordReset: NEXT_PUBLIC_SITE_URL is not set; cannot send reset email.",
    );
    return { ok: true };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    console.error("requestPasswordReset:", error.message);
  }

  return { ok: true };
}

export async function updatePassword(
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Invalid password.",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your reset link has expired or is invalid. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data,
  });

  if (error) {
    console.error("updatePassword:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
