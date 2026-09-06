import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export async function GET() {
  try {
    const [profile, skills, experiences, repos, knowledge] = await Promise.all([
      db.profile.findUnique({ where: { id: "main" } }),
      db.skill.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] }),
      db.experience.findMany({ orderBy: { order: "asc" } }),
      db.repo.findMany({ orderBy: { order: "asc" } }),
      db.knowledgeItem.findMany({ orderBy: { order: "asc" } }),
    ]);

    // last 400 days of contributions (enough history for a Sunday-aligned 52-week grid)
    const start = new Date();
    start.setDate(start.getDate() - 400);
    const startKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;

    const contributions = await db.contribution.findMany({
      where: { date: { gte: startKey } },
      orderBy: { date: "asc" },
      select: { date: true, count: true, note: true },
    });

    return Response.json({
      profile: profile ?? null,
      skills,
      experiences,
      repos,
      knowledge,
      contributions,
    });
  } catch (err) {
    console.error("portfolio GET failed", err);
    return Response.json({ error: "Failed to load portfolio" }, { status: 500 });
  }
}
