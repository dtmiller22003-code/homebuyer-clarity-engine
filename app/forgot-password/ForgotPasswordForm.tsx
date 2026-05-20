"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    setSubmitted(true);
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
              Internal Team Dashboard
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-surface-200 p-6">
          <h2 className="text-base font-semibold text-surface-900 mb-1">
            Reset your password
          </h2>
          <p className="text-xs text-surface-500 mb-5">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {submitted ? (
            <div className="text-xs text-green-800 bg-green-50 border border-green-100 rounded px-3 py-2">
              If an account exists for that email, you&apos;ll receive a reset
              link shortly. Check your inbox and spam folder.
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium py-2 rounded"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-center text-surface-500 mt-4">
          <Link href="/login" className="text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
