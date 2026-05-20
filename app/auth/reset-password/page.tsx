import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

function serializeUnknownError(error: unknown): Record<string, unknown> {
  if (error === null || error === undefined) {
    return { present: false };
  }
  if (typeof error !== "object") {
    return { raw: String(error) };
  }
  const record = error as Record<string, unknown>;
  return {
    message: record.message ?? null,
    code: record.code ?? null,
    status: record.status ?? null,
    name: record.name ?? null,
    json: JSON.stringify(error),
  };
}

function buildRequestUrl(
  searchParams: { token_hash?: string; type?: string },
): string {
  const qs = new URLSearchParams();
  if (searchParams.token_hash) {
    qs.set("token_hash", searchParams.token_hash);
  }
  if (searchParams.type) {
    qs.set("type", searchParams.type);
  }
  const path = "/auth/reset-password";
  const query = qs.toString();
  const pathWithQuery = query ? `${path}?${query}` : path;

  try {
    const hdrs = headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    if (host) {
      return `${proto}://${host}${pathWithQuery}`;
    }
  } catch {
    // headers() unavailable outside request context
  }

  return pathWithQuery;
}

function ResetPasswordInvalidSession({
  diagnostics,
}: {
  diagnostics: Record<string, unknown>;
}) {
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
            We could not confirm this password reset link. Request a new one to
            continue.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-brand hover:underline font-medium"
          >
            Request a new reset link
          </Link>

          <details className="mt-4 rounded border border-surface-200 bg-surface-100 p-3 text-xs font-mono text-surface-800">
            <summary className="cursor-pointer font-sans text-surface-700">
              Diagnostic details (for debugging)
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
              <code>{JSON.stringify(diagnostics, null, 2)}</code>
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; type?: string };
}) {
  const rawTokenHash = searchParams.token_hash ?? null;
  const rawType = searchParams.type ?? null;
  const tokenHash = rawTokenHash?.trim() ?? null;
  const type = rawType?.trim() ?? null;
  const timestamp = new Date().toISOString();
  const requestUrl = buildRequestUrl(searchParams);

  const diagnosticsBeforeVerify: Record<string, unknown> = {
    capturedAt: timestamp,
    requestUrl,
    rawTokenHash,
    rawType,
    trimmedTokenHash: tokenHash,
    trimmedType: type,
    tokenHashPrefix: tokenHash ? tokenHash.slice(0, 12) : null,
    tokenHashLength: tokenHash?.length ?? 0,
    nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    supabaseClientFlowType:
      "not exposed by lib/supabase/server.ts createClient() — no flowType in config",
  };

  let sessionValid = false;
  let verifyOtpResult: Record<string, unknown> = {
    attempted: false,
    skippedReason: null as string | null,
  };

  if (tokenHash && type === "recovery") {
    verifyOtpResult.attempted = true;
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });

      sessionValid = !error;
      verifyOtpResult = {
        ...verifyOtpResult,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
        error: error ? serializeUnknownError(error) : null,
      };
    } catch (caught) {
      sessionValid = false;
      verifyOtpResult = {
        ...verifyOtpResult,
        data: null,
        error: null,
        caughtException: serializeUnknownError(caught),
      };
    }
  } else {
    verifyOtpResult.skippedReason =
      !tokenHash && !type
        ? "missing token_hash and type"
        : !tokenHash
          ? "missing token_hash"
          : type !== "recovery"
            ? `type is "${type}" (expected "recovery")`
            : "unknown";
  }

  const diagnostics: Record<string, unknown> = {
    ...diagnosticsBeforeVerify,
    sessionValid,
    verifyOtp: verifyOtpResult,
  };

  console.error(
    "RESET_PASSWORD_DIAGNOSTICS:",
    JSON.stringify(diagnostics, null, 2),
  );

  if (!sessionValid) {
    return (
      <Suspense fallback={null}>
        <ResetPasswordInvalidSession diagnostics={diagnostics} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <ResetPasswordForm sessionValid={sessionValid} />
    </Suspense>
  );
}
