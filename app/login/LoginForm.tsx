"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function errorMessageForParam(code: string | null): string | null {
  if (code === "auth_callback") {
    return "Sign-in link expired or is invalid. Try again from your email or use Forgot password.";
  }
  if (code === "not_provisioned") {
    return "Your account isn't provisioned yet. Contact your admin.";
  }
  if (code === "realtor_inactive") {
    return "This partner profile is inactive or was removed by your organization. If your access should be active, ask your admin to restore it. If you still have access and only forgot your password, use Forgot password below.";
  }
  return null;
}

function messageForParam(message: string | null): string | null {
  if (message === "password_reset") {
    return "Password updated. You can sign in with your new password.";
  }
  return null;
}

/** Base URL for Supabase redirect (must match Supabase Dashboard → Auth → URL config). */
function getSiteUrlForAuth(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const initialMessage = searchParams.get("message");

  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorMessageForParam(initialError),
  );
  const [info, setInfo] = useState<string | null>(
    messageForParam(initialMessage),
  );

  useEffect(() => {
    const forgot = searchParams.get("forgot");
    if (forgot === "1" || forgot === "true") {
      setMode("forgot");
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("error") === "realtor_inactive") {
      const supabase = createClient();
      void supabase.auth.signOut();
    }
  }, [searchParams]);

  useEffect(() => {
    setInfo(messageForParam(searchParams.get("message")));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setError(null);
    setInfo(null);

    const site = getSiteUrlForAuth();
    if (!site) {
      setError(
        "This site is missing NEXT_PUBLIC_SITE_URL. Add it so password reset links work.",
      );
      setForgotLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${site}/reset-password`,
      },
    );

    setForgotLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    setInfo(
      "If this email exists, a password reset link has been sent. Check your inbox.",
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 bg-brand rounded flex items-center justify-center font-bold text-white">
            H
          </div>
          <div>
            <h1 className="text-lg font-semibold text-surface-900 leading-tight">
              Homebuyer Clarity Engine
            </h1>
            <p className="text-xs text-surface-500 leading-tight">
              Team &amp; partner sign-in
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-surface-200 p-6">
          {mode === "signin" ? (
            <>
              <h2 className="text-base font-semibold text-surface-900 mb-1">
                Sign in
              </h2>
              <p className="text-xs text-surface-500 mb-5">
                Admins send invites for new accounts. Use Forgot password if you
                need to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-surface-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-surface-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>

                {error && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium py-2 rounded"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/login?forgot=1"
                  scroll={false}
                  className="text-xs font-medium text-brand hover:underline"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  Forgot password?
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-surface-900 mb-1">
                Reset password
              </h2>
              <p className="text-xs text-surface-500 mb-5">
                Enter your email. If an account exists, you will receive a reset
                link.
              </p>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-medium text-surface-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>

                {error && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium py-2 rounded"
                >
                  {forgotLoading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  scroll={false}
                  className="text-xs font-medium text-surface-600 hover:text-surface-900 hover:underline"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>

        {mode === "signin" ? (
          <p className="text-xs text-center text-surface-500 mt-4">
            Need an account? Your organization&apos;s admin can send an invite.
          </p>
        ) : null}
      </div>
    </div>
  );
}
