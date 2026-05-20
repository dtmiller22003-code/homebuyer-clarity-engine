import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; type?: string };
}) {
  const tokenHash = searchParams.token_hash?.trim();
  const type = searchParams.type?.trim();

  let sessionValid = false;

  if (tokenHash && type === "recovery") {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    sessionValid = !error;
    if (error) {
      console.error("reset-password verifyOtp:", error.message);
    }
  }

  return (
    <Suspense fallback={null}>
      <ResetPasswordForm sessionValid={sessionValid} />
    </Suspense>
  );
}
