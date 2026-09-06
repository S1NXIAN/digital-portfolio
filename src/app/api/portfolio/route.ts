import { db } from "@/lib/db";
import { getPortfolioCache, setPortfolioCache } from "@/lib/portfolio-cache";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

async function loadPortfolio() {
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

  return {
    profile: profile ?? null,
    skills,
    experiences,
    repos,
    knowledge,
    contributions,
  };
}

export async function GET() {
  try {
    // Cache stores the pre-serialized JSON string, so hits skip both the DB
    // and JSON.stringify — flat latency even with large payloads.
    const cached = getPortfolioCache();
    if (cached) {
      return new Response(cached, {
        headers: { "content-type": "application/json", "X-Cache": "HIT" },
      });
    }

    const data = await loadPortfolio();
    setPortfolioCache(data);
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json", "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("portfolio GET failed", err);
    return Response.json({ error: "Failed to load portfolio" }, { status: 500 });
  }
}
