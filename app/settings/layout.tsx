import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { isRealtorPartnerRole } from "@/lib/auth-roles";
import { getAuthContext } from "@/lib/supabase/auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();
  if (isRealtorPartnerRole(auth.role)) {
    redirect("/realtor");
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <TopBar
        user={{
          displayName: auth.displayName,
          email: auth.email,
          role: auth.role,
        }}
      />
      {children}
    </div>
  );
}
