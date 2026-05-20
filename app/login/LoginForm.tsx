"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function errorMessageForParam(code: string | null): string | null {
  if (code === "auth_callback") {
    return "Sign-in link expired or is invalid. Try again from your email or use Forgot password.";
  }
  if (code === "invalid_reset_link") {
    return "That password reset link is invalid or has expired. Request a new one.";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const initialMessage = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorMessageForParam(initialError),
  );
  const [info, setInfo] = useState<string | null>(
    messageForParam(initialMessage),
  );

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
              <p className="mt-1.5 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
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
        </div>

        <p className="text-xs text-center text-surface-500 mt-4">
          Need an account? Your organization&apos;s admin can send an invite.
        </p>
      </div>
    </div>
  );
}
