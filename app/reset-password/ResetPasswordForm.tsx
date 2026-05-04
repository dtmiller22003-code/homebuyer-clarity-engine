"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LEN = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recoverySeen = useRef(false);

  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoverySeen.current = true;
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    const run = async () => {
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeErr } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeErr) {
          recoverySeen.current = true;
          setHasRecoverySession(true);
          setChecking(false);
          return;
        }
      }

      const hash =
        typeof window !== "undefined" ? window.location.hash : "";
      const looksLikeRecoveryHash =
        hash.includes("type=recovery") || hash.includes("type%3Drecovery");

      const { data: { session } } = await supabase.auth.getSession();
      if (session && (recoverySeen.current || looksLikeRecoveryHash)) {
        setHasRecoverySession(true);
        setChecking(false);
        return;
      }

      if (looksLikeRecoveryHash && !session) {
        await new Promise((r) => setTimeout(r, 400));
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (s2) {
          setHasRecoverySession(true);
        }
        setChecking(false);
        return;
      }

      if (session && !looksLikeRecoveryHash && !code) {
        setHasRecoverySession(false);
        setChecking(false);
        return;
      }

      setHasRecoverySession(false);
      setChecking(false);
    };

    void run();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({
      password,
    });

    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setLoading(false);
    window.setTimeout(() => {
      router.push("/login?message=password_reset");
    }, 1200);
  };

  if (checking) {
    return (
      <div className="text-center text-sm text-surface-600 py-8">
        Verifying reset link…
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-surface-700">
          This reset link is invalid or has expired. Request a new one from the
          login page.
        </p>
        <p className="text-xs text-surface-500">
          If you are already signed in, sign out first or open the link from your
          email.
        </p>
        <a
          href="/login"
          className="inline-block text-sm font-medium text-brand hover:underline"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm font-medium text-emerald-800">
          Password updated successfully.
        </p>
        <p className="text-xs text-surface-600">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="new-password"
          className="block text-xs font-medium text-surface-700 mb-1"
        >
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LEN}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
        />
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="block text-xs font-medium text-surface-700 mb-1"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LEN}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
        />
      </div>

      {error ? (
        <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium py-2 rounded"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
