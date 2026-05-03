"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole } from "@/lib/auth-roles";

interface TopBarProps {
  user: { displayName: string; email: string; role: string };
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const initials = user.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const homeHref = user.role === "realtor_partner" ? "/realtor" : "/";

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-surface-900 text-white">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-brand rounded flex items-center justify-center font-bold text-sm">
          H
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">
            Homebuyer Clarity Engine
          </h1>
          <p className="text-[10px] text-surface-400 leading-tight">
            Internal Dashboard · Phase 2B
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <Link href={homeHref} className="text-surface-300 hover:text-white">
          Home
        </Link>
        {isAdminRole(user.role) && (
          <>
            <Link
              href="/settings/branding"
              className="text-surface-300 hover:text-white"
            >
              Settings
            </Link>
            <Link
              href="/settings/realtors"
              className="text-surface-300 hover:text-white"
            >
              Realtors
            </Link>
          </>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-xs font-semibold">
            {initials || "?"}
          </div>
          <div className="hidden sm:block">
            <div className="text-white leading-tight">{user.displayName}</div>
            <div className="text-[10px] text-surface-400 leading-tight">
              {user.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-surface-300 hover:text-white disabled:opacity-50"
        >
          {signingOut ? "..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
