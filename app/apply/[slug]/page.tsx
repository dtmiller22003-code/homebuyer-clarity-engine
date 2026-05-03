import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy LO public URL — canonical path is /apply/lo/[slug]. */
export default function LegacyApplyLoSlugRedirect({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug?.trim();
  if (!slug) {
    permanentRedirect("/apply");
  }
  permanentRedirect(`/apply/lo/${encodeURIComponent(slug)}`);
}
