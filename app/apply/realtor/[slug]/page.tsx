import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Personal partner link — short intake with attribution. */
export default function ApplyRealtorPartnerPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug?.trim();
  if (!slug) {
    redirect("/apply/short");
  }
  redirect(`/apply/short?partner=${encodeURIComponent(slug)}`);
}
