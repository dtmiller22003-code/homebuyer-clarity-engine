// =============================================================================
// Resolve the single organization used for public /apply routes and partner
// redirects. Shared by public server actions and apply redirect pages.
// =============================================================================

import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";

export function publicOrganizationIdFromEnv(): string | null {
  const raw = process.env.PUBLIC_ORGANIZATION_ID?.trim();
  if (!raw) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  ) {
    return null;
  }
  return raw;
}

/**
 * The one organization that powers public intake + partner links.
 * Prefer PUBLIC_ORGANIZATION_ID; else oldest org by created_at.
 */
export async function getPublicOrganizationRow() {
  const explicitId = publicOrganizationIdFromEnv();
  if (explicitId) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, explicitId))
      .limit(1);
    return org ?? null;
  }
  const [org] = await db
    .select()
    .from(organizations)
    .orderBy(asc(organizations.createdAt))
    .limit(1);
  return org ?? null;
}
