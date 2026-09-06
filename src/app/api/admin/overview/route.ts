import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { getLastRun, nextPhMidnightISO } from "@/lib/contributions-sync";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export async function GET(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();

  try {
    const [profile, skillCount, experienceCount, repoCount, knowledgeCount, contributionAgg] =
      await Promise.all([
        db.profile.findUnique({ where: { id: "main" } }),
        db.skill.count(),
        db.experience.count(),
        db.repo.count(),
        db.knowledgeItem.count(),
        db.contribution.aggregate({ _sum: { count: true }, _count: { date: true } }),
      ]);

    // last ~12 months window (same as the public site)
    const start = new Date();
    start.setDate(start.getDate() - 400);
    const startKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const yearSum = await db.contribution.aggregate({
      where: { date: { gte: startKey } },
      _sum: { count: true },
    });

    // Database storage size via PostgreSQL
    let dbSizeBytes = 0;
    try {
      const rows = await db.$queryRawUnsafe<{ size: bigint | number | string }[]>(
        "SELECT pg_database_size(current_database()) AS size"
      );
      dbSizeBytes = Number(rows?.[0]?.size ?? 0);
    } catch (err) {
      console.warn("[overview] failed to read db size:", err);
    }

    const [lastRun, featuredRepos] = await Promise.all([
      getLastRun(),
      db.repo.count({ where: { featured: true } }),
    ]);

    // profile completeness heuristics
    const p = profile;
    const checks = p
      ? [
          Boolean(p.name && p.name !== "Your Name"),
          Boolean(p.headline),
          Boolean(p.bio),
          Boolean(p.photoUrl),
          Boolean(p.email),
          Boolean(p.location),
          Boolean(p.motto),
          Array.isArray(p.socials) && (p.socials as unknown[]).length > 0,
          Boolean(p.githubUsername),
          Boolean(p.resumeUrl),
        ]
      : [];
    const completeness = checks.length
      ? Math.round((checks.filter(Boolean).length / checks.length) * 100)
      : 0;

    return Response.json({
      counts: {
        skills: skillCount,
        experiences: experienceCount,
        repos: repoCount,
        featuredRepos,
        knowledge: knowledgeCount,
        contributionDays: contributionAgg._count.date,
        contributionsYear: yearSum._sum.count ?? 0,
      },
      profile: {
        updatedAt: profile?.updatedAt ?? null,
        completeness,
        name: profile?.name ?? "",
      },
      system: {
        uptimeSec: Math.round(process.uptime()),
        nodeVersion: process.version,
        dbSizeBytes,
        selfPingEnabled: process.env.SELF_PING_ENABLED === "true",
        nextSyncAt: nextPhMidnightISO(),
        lastRun,
      },
    });
  } catch (err) {
    console.error("overview GET failed", err);
    return Response.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
