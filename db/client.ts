// =============================================================================
// Server-only Drizzle client.
// Import only from server components, server actions, or route handlers.
// =============================================================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check .env.local");
}

// Supabase's pooler handles connection management, so a small pool is fine.
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // required for Supabase's PgBouncer in transaction mode
  max: 10,
});

export const db = drizzle(client, { schema });
export { schema };
