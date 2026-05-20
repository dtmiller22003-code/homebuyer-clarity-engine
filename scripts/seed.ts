// =============================================================================
// Seed script for initial setup.
//
// USAGE:
//   1. Create a user in Supabase Auth dashboard (Authentication → Users → Add user)
//   2. Copy that user's UUID
//   3. Run: SEED_USER_ID=<uuid> SEED_USER_EMAIL=<email> SEED_USER_NAME="Your Name" npm run db:seed
//
// This creates an organization, adds the user as a team member, and loads
// the 8 scenario leads so the dashboard has data to display.
// =============================================================================

import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import {
  leads,
  organizations,
  realtorPartners,
  teamMembers,
} from "../db/schema";
import { mockLeads } from "../lib/mock-data";

dotenv.config({ path: ".env.local" });

const SEED_ORG_NAME = "Cleared Home Lending";

async function main() {
  const { SEED_USER_ID, SEED_USER_EMAIL, SEED_USER_NAME, DATABASE_URL } =
    process.env;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL not set in .env.local");
  }
  if (!SEED_USER_ID || !SEED_USER_EMAIL || !SEED_USER_NAME) {
    console.error(
      "Required env vars: SEED_USER_ID, SEED_USER_EMAIL, SEED_USER_NAME",
    );
    console.error(
      '\nExample:\n  SEED_USER_ID=xxx-xxx SEED_USER_EMAIL="me@example.com" SEED_USER_NAME="Diana" npm run db:seed',
    );
    process.exit(1);
  }

  const client = postgres(DATABASE_URL, { prepare: false, max: 1 });
  const db = drizzle(client);

  console.log("→ Checking for existing organization...");
  let [org] = await db.select().from(organizations).limit(1);

  if (!org) {
    console.log("→ Creating organization...");
    [org] = await db
      .insert(organizations)
      .values({ name: SEED_ORG_NAME })
      .returning();
  } else {
    console.log(`→ Using existing org: ${org.name}`);
    if (org.name !== SEED_ORG_NAME) {
      [org] = await db
        .update(organizations)
        .set({ name: SEED_ORG_NAME })
        .where(eq(organizations.id, org.id))
        .returning();
      console.log(`→ Renamed organization to "${SEED_ORG_NAME}"`);
    }
  }

  console.log("→ Upserting team member...");
  const existing = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, SEED_USER_ID))
    .limit(1);

  let memberId: string;

  if (existing.length === 0) {
    const [inserted] = await db
      .insert(teamMembers)
      .values({
        userId: SEED_USER_ID,
        organizationId: org.id,
        displayName: SEED_USER_NAME,
        email: SEED_USER_EMAIL,
        role: "admin",
        slug: "admin",
        phone: null,
        bio: null,
      })
      .returning();
    memberId = inserted.id;
    console.log(`→ Created team member: ${SEED_USER_NAME}`);
  } else {
    memberId = existing[0].id;
    await db
      .update(teamMembers)
      .set({
        slug: "admin",
        displayName: SEED_USER_NAME,
        email: SEED_USER_EMAIL,
        role: "admin",
      })
      .where(eq(teamMembers.userId, SEED_USER_ID));
    console.log(`→ Team member already exists; ensured slug "admin"`);
  }

  if (org.defaultAssigneeId !== memberId) {
    await db
      .update(organizations)
      .set({ defaultAssigneeId: memberId })
      .where(eq(organizations.id, org.id));
    console.log("→ Set organization default assignee to admin member");
  }

  const exampleRealtor = await db
    .select()
    .from(realtorPartners)
    .where(
      and(
        eq(realtorPartners.organizationId, org.id),
        eq(realtorPartners.slug, "example"),
      ),
    )
    .limit(1);

  if (exampleRealtor.length === 0) {
    await db.insert(realtorPartners).values({
      organizationId: org.id,
      displayName: "Example Realtor",
      email: "realtor@example.com",
      phone: null,
      slug: "example",
      brokerage: "Example Realty",
    });
    console.log("→ Seeded example realtor_partner row");
  }

  console.log("→ Seeding 8 mock leads...");
  let inserted = 0;
  for (const lead of mockLeads) {
    await db.insert(leads).values({
      organizationId: org.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      assignedTo: lead.assignedTo,
      createdBy: lead.createdBy,
      leadSource: lead.leadSource,
      creditRange: lead.creditRange,
      annualGrossIncome: lead.annualGrossIncome,
      monthlyDebtPayments: lead.monthlyDebtPayments,
      cashAvailable: lead.cashAvailable,
      employmentType: lead.employmentType,
      hasFiledTaxes:
        lead.hasFiledTaxes === undefined
          ? null
          : lead.hasFiledTaxes
            ? "true"
            : "false",
      heavyWriteOffs:
        lead.heavyWriteOffs === undefined
          ? null
          : lead.heavyWriteOffs
            ? "true"
            : "false",
      targetPurchasePrice: lead.targetPurchasePrice ?? null,
      notes: lead.notes ?? null,
      status: lead.status,
      decision: lead.decision,
    });
    inserted++;
  }
  console.log(`→ Inserted ${inserted} leads`);

  console.log("\n✅ Seed complete. Start the app with: npm run dev");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
