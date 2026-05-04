// =============================================================================
// Supabase client for use in CLIENT components only.
// For server actions or server components, use lib/supabase/server.ts
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: true,
      },
    },
  );
}
