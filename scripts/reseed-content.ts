/**
 * Re-apply seed CONTENT to a live database.
 *
 * Replaces profile, skills, experiences, knowledge and repo rows with the
 * current seed content (src/lib/seed.ts) while deliberately preserving:
 *   - Settings  → admin passcode, GitHub token, sync bookkeeping
 *   - Contributions → real synced GitHub activity
 *
 * Fake placeholder repos (github.com/alexcarter/*) are removed; real
 * github.com/S1NXIAN rows are upserted by URL (stars/forks kept in sync with
 * the values in the seed; curated featured flags & order come from the seed).
 *
 * The running server's portfolio cache expires after 20s, so public pages
 * reflect this script without a restart.
 *
 * Usage: bun run scripts/reseed-content.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  SEED_PROFILE,
  SEED_SKILLS,
  SEED_EXPERIENCES,
  SEED_REPOS,
  SEED_KNOWLEDGE,
} from "../src/lib/seed";

const db = new PrismaClient();

async function main() {
  // ---- Profile (upsert with full content — unlike seedDatabase, also UPDATE) ----
  const { id: _id, ...profileData } = SEED_PROFILE;
  await db.profile.upsert({
    where: { id: "main" },
    update: profileData,
    create: SEED_PROFILE,
  });

  // ---- Skills ----
  await db.skill.deleteMany();
  await db.skill.createMany({
    data: SEED_SKILLS.map(({ name, category, level, order, icon }) => ({
      name,
      category,
      level,
      order,
      icon: icon ?? "",
    })),
  });

  // ---- Experience ----
  await db.experience.deleteMany();
  await db.experience.createMany({ data: SEED_EXPERIENCES });

  // ---- Knowledge ----
  await db.knowledgeItem.deleteMany();
  await db.knowledgeItem.createMany({ data: SEED_KNOWLEDGE });

  // ---- Repos ----
  // Drop the old placeholder persona repos (non-existent URLs on github.com).
  const removedFake = await db.repo.deleteMany({
    where: { url: { contains: "github.com/alexcarter" } },
  });
  // Upsert the real S1NXIAN repositories by URL (url is not unique in the schema).
  for (let i = 0; i < SEED_REPOS.length; i += 1) {
    const seed = SEED_REPOS[i];
    const existing = await db.repo.findFirst({ where: { url: seed.url } });
    if (existing) {
      await db.repo.update({
        where: { id: existing.id },
        data: {
          name: seed.name,
          description: seed.description,
          language: seed.language,
          stars: seed.stars,
          forks: seed.forks,
          featured: seed.featured,
          order: i,
        },
      });
    } else {
      await db.repo.create({ data: { ...seed, order: i } });
    }
  }

  const [skills, experiences, repos, knowledge] = await Promise.all([
    db.skill.count(),
    db.experience.count(),
    db.repo.count(),
    db.knowledgeItem.count(),
  ]);

  console.log(
    `[reseed-content] done — profile updated (Joshua Deaño), skills=${skills}, ` +
      `experiences=${experiences}, repos=${repos} (removed ${removedFake.count} fake), ` +
      `knowledge=${knowledge}. Settings & contributions untouched.`
  );
}

main()
  .catch((err) => {
    console.error("[reseed-content] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
