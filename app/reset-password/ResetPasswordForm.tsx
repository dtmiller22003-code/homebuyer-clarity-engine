"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LEN = 8;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Clear consumed PKCE query + hash from the address bar without reloading. */
function stripSensitiveUrlArtifacts() {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", "/reset-password");
}

function hashLooksLikeRecovery(hash: string): boolean {
  if (!hash) return false;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    const decoded = decodeURIComponent(raw);
    return (
      /(^|&)type=recovery(&|$)/i.test(decoded) ||
      raw.includes("type%3Drecovery") ||
      raw.includes("type%3drecovery")
    );
  } catch {
    return (
      raw.includes("type=recovery") ||
      raw.includes("type%3Drecovery") ||
      raw.includes("type%3drecovery")
    );
  }
}

/** Poll until getSession returns a user (handles race after exchange / detectSessionInUrl). */
async function waitForSession(
  supabase: ReturnType<typeof createClient>,
  opts: { attempts: number; gapMs: number },
): Promise<boolean> {
  for (let i = 0; i < opts.attempts; i++) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return true;
    if (i < opts.attempts - 1) await delay(opts.gapMs);
  }
  return false;
}

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
  const [linkDetail, setLinkDetail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoverySeen.current = true;
      }
    });

    const run = async () => {
      setLinkDetail(null);
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type");
      const hash =
        typeof window !== "undefined" ? window.location.hash ?? "" : "";
      const fromRecoveryHash = hashLooksLikeRecovery(hash);

      const finishSuccess = () => {
        if (cancelled) return;
        recoverySeen.current = true;
        setHasRecoverySession(true);
        setChecking(false);
        stripSensitiveUrlArtifacts();
      };

      // PKCE / code flow
      if (code) {
        let exchangeErr: { message: string } | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            exchangeErr = null;
            break;
          }
          exchangeErr = error;
          if (attempt === 0) await delay(500);
        }

        if (!exchangeErr) {
          const ok = await waitForSession(supabase, {
            attempts: 10,
            gapMs: 120,
          });
          if (ok) {
            finishSuccess();
            return;
          }
          // Session cookie may lag behind exchange — poll once more, slower
          const okLate = await waitForSession(supabase, {
            attempts: 8,
            gapMs: 250,
          });
          if (okLate) {
            finishSuccess();
            return;
          }
        } else {
          if (!cancelled) setLinkDetail(exchangeErr.message);
        }
      }

      // Some email templates land with token_hash + type=recovery (no ?code=)
      if (otpType === "recovery" && tokenHash) {
        let otpErr: { message: string } | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (!error) {
            otpErr = null;
            break;
          }
          otpErr = error;
          if (attempt === 0) await delay(500);
        }
        if (!otpErr) {
          const ok = await waitForSession(supabase, {
            attempts: 10,
            gapMs: 120,
          });
          if (ok) {
            finishSuccess();
            return;
          }
          const okLate = await waitForSession(supabase, {
            attempts: 8,
            gapMs: 250,
          });
          if (okLate) {
            finishSuccess();
            return;
          }
        } else if (!cancelled) {
          setLinkDetail(otpErr.message);
        }
      }

      // Hash / implicit flow: detectSessionInUrl parses asynchronously
      if (fromRecoveryHash) {
        for (let round = 0; round < 2; round++) {
          const ok = await waitForSession(supabase, {
            attempts: 12,
            gapMs: 120,
          });
          if (ok) {
            finishSuccess();
            return;
          }
          if (round === 0) await delay(400);
        }
      }

      // Recovery event may have fired; or session updated without hash/code in URL yet
      if (recoverySeen.current) {
        const ok = await waitForSession(supabase, {
          attempts: 6,
          gapMs: 100,
        });
        if (ok) {
          if (!cancelled) {
            setHasRecoverySession(true);
            setChecking(false);
            stripSensitiveUrlArtifacts();
          }
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user && recoverySeen.current) {
        if (!cancelled) {
          setHasRecoverySession(true);
          setChecking(false);
          stripSensitiveUrlArtifacts();
        }
        return;
      }

      // PASSWORD_RECOVERY may fire just after the checks above
      await delay(150);
      if (recoverySeen.current) {
        const late = await waitForSession(supabase, {
          attempts: 8,
          gapMs: 80,
        });
        if (late) {
          if (!cancelled) {
            setHasRecoverySession(true);
            setChecking(false);
            stripSensitiveUrlArtifacts();
          }
          return;
        }
      }

      if (!cancelled) {
        setHasRecoverySession(false);
        setChecking(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      recoverySeen.current = false;
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
          We could not confirm this password reset link. It may have expired, or
          the link was already used. Request a new reset email from the sign-in
          page and open the new link in this same browser when you are ready to
          choose a password.
        </p>
        {linkDetail ? (
          <p className="text-xs text-surface-500">{linkDetail}</p>
        ) : null}
        <p className="text-xs text-surface-500">
          If you use a different browser or device, use the link there instead of
          copying only part of the URL. You do not need to sign out first.
        </p>
        <a
          href="/login?forgot=1"
          className="inline-block text-sm font-medium text-brand hover:underline"
        >
          Back to sign in / request new link
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
