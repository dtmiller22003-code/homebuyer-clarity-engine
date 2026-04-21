import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BrandingForm } from "@/app/settings/branding/BrandingForm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function BrandingSettingsPage() {
  const auth = await getAuthContext();
  if (auth.role !== "admin") {
    redirect("/");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, auth.organizationId))
    .limit(1);

  if (!org) {
    redirect("/");
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">Branding</h1>
        <p className="text-sm text-surface-600 mt-1">
          Update public /apply colors, contact info, logo URL, and font.
        </p>
      </div>

      <BrandingForm
        initial={{
          companyName: org.name,
          primaryColor: org.primaryColor,
          secondaryColor: org.secondaryColor,
          accentColor: org.accentColor,
          logoUrl: org.logoUrl,
          fontPreset: org.fontPreset,
          companyEmail: org.companyEmail,
          companyPhone: org.companyPhone,
        }}
      />
    </div>
  );
}
