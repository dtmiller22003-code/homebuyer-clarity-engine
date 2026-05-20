"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updatePassword } from "@/app/actions/auth";

export function ResetPasswordForm({
  sessionValid,
}: {
  sessionValid: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push("/login");
    }, 2000);
    return () => clearTimeout(timer);
  }, [success, router]);

  if (!sessionValid) {
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
                Internal Team Dashboard
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-surface-200 p-6">
            <h2 className="text-base font-semibold text-surface-900 mb-1">
              Reset link invalid
            </h2>
            <p className="text-xs text-surface-500 mb-4">
              We could not confirm this password reset link. Request a new one
              to continue.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm text-brand hover:underline font-medium"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setError(null);

    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  };

  const displayError = validationError ?? error;

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
              Internal Team Dashboard
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-surface-200 p-6">
          <h2 className="text-base font-semibold text-surface-900 mb-1">
            Set a new password
          </h2>
          <p className="text-xs text-surface-500 mb-5">
            Choose a password with at least 8 characters.
          </p>

          {success ? (
            <div className="text-xs text-green-800 bg-green-50 border border-green-100 rounded px-3 py-2">
              Password updated. Redirecting you to sign in...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-surface-700 mb-1"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-surface-700 mb-1"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              {displayError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {displayError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium py-2 rounded"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>

        {!success && (
          <p className="text-xs text-center text-surface-500 mt-4">
            <Link href="/login" className="text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
