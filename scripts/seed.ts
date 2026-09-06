/**
 * Seed script — force-repopulates the portfolio database.
 * Run: bun run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed";

const db = new PrismaClient();

console.log("Seeding…");

seedDatabase(db)
  .then((r) => {
    console.log(
      `Seeded: skills=${r.skills}, experiences=${r.experiences}, repos=${r.repos}, knowledge=${r.knowledge}, contributions=${r.contributions}`
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
