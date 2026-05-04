import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
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
              Set a new password
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-surface-200 p-6">
          <h2 className="text-base font-semibold text-surface-900 mb-1">
            Reset password
          </h2>
          <p className="text-xs text-surface-500 mb-5">
            Choose a new password for your account.
          </p>

          <Suspense fallback={<div className="text-sm text-surface-600">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-xs text-center text-surface-500 mt-4">
          <a href="/login" className="text-brand font-medium hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
