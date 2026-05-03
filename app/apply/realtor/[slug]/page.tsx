import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { handleRealtorApplyLink } from "@/lib/apply-partner-redirect";

export const dynamic = "force-dynamic";

export default async function ApplyRealtorPartnerPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug?.trim();
  if (!slug) {
    redirect("/apply/short");
  }

  const result = await handleRealtorApplyLink(slug);
  if ("notFound" in result) {
    notFound();
  }
  if ("inactive" in result) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16 text-center">
        <div className="rounded-xl border border-surface-200 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-surface-900">
            This partner link is no longer active
          </h1>
          <p className="mt-3 text-sm text-surface-600 leading-relaxed">
            You can still continue to the company application using the link
            below.
          </p>
          <a
            href={result.companyApplicationUrl}
            className="mt-6 inline-flex w-full justify-center rounded-md bg-[color:var(--brand-primary,#1e40af)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Continue to application
          </a>
          <p className="mt-4 text-xs text-surface-500">
            <Link href="/apply/short" className="text-brand hover:underline">
              Or start a quick check without a partner link
            </Link>
          </p>
        </div>
      </div>
    );
  }
  if (result.mode === "redirect") {
    redirect(result.url);
  }

  if (result.mode !== "branding") {
    notFound();
  }

  const { externalUrl, partner } = result;

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16 text-center">
      <div className="rounded-xl border border-surface-200 bg-white p-8 shadow-sm">
        {partner.personalLogoUrl ? (
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- partner-supplied HTTPS URL */}
            <img
              src={partner.personalLogoUrl}
              alt=""
              className="max-h-20 w-auto max-w-full object-contain"
            />
          </div>
        ) : null}
        <h1 className="text-xl font-semibold text-surface-900 tracking-tight">
          {partner.displayName}
        </h1>
        {partner.subtitle ? (
          <p className="mt-3 text-sm text-surface-600 leading-relaxed">
            {partner.subtitle}
          </p>
        ) : null}
        <a
          href={externalUrl}
          className="mt-8 inline-flex w-full justify-center rounded-md bg-[color:var(--brand-primary,#1e40af)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Continue to full application
        </a>
        <p className="mt-4 text-xs text-surface-500 leading-relaxed">
          You will leave this site to complete your application with our lending
          partner.
        </p>
      </div>
    </div>
  );
}
