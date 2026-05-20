// Password recovery now lands on /auth/reset-password with token_hash (OTP flow).
// This route remains for other Supabase auth callbacks that use ?code= (PKCE).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_reset_link", requestUrl.origin),
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("auth/callback exchangeCodeForSession:", error.message);
    return NextResponse.redirect(
      new URL("/login?error=invalid_reset_link", requestUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL("/auth/reset-password", requestUrl.origin),
  );
}
