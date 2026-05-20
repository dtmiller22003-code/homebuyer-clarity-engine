import { notFound, redirect } from "next/navigation";
import { handleLoanOfficerApplyLink } from "@/lib/apply-partner-redirect";

export const dynamic = "force-dynamic";

export default async function ApplyLoanOfficerPublicPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug?.trim();
  if (!slug) {
    notFound();
  }

  const result = await handleLoanOfficerApplyLink(slug);
  if ("notFound" in result) {
    notFound();
  }
  redirect(result.url);
}
