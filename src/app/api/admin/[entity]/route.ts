import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { invalidatePortfolioCache } from "@/lib/portfolio-cache";
import { guardBodySize } from "@/lib/rate-limit";
import { LIMITS, MAX_BODY_BYTES } from "@/lib/limits";
import { skillIconSchema } from "@/lib/skill-icon-schema";

export const dynamic = "force-dynamic";

type LooseDelegate = {
  findMany: (args?: { orderBy?: unknown }) => Promise<unknown[]>;
  create: (args: { data: unknown }) => Promise<unknown>;
  count: () => Promise<number>;
};

const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required").max(LIMITS.skillName),
  category: z.string().min(1, "Category is required").max(LIMITS.skillCategory),
  level: z.coerce.number().int().min(0).max(100).default(80),
  order: z.coerce.number().int().default(0),
  icon: skillIconSchema,
});

const entities = {
  skills: { delegate: "skill" as const, schema: skillSchema, cap: LIMITS.maxSkills },
  experiences: { delegate: "experience" as const, cap: LIMITS.maxExperiences, schema: z.object({
    company: z.string().min(1, "Company is required").max(LIMITS.company),
    role: z.string().min(1, "Role is required").max(LIMITS.role),
    period: z.string().min(1, "Period is required").max(LIMITS.period),
    description: z.string().max(LIMITS.experienceDescription).default(""),
    tech: z.string().max(LIMITS.tech).default(""),
    current: z.coerce.boolean().default(false),
    order: z.coerce.number().int().default(0),
  }) },
  repos: { delegate: "repo" as const, cap: LIMITS.maxRepos, schema: z.object({
    name: z.string().min(1, "Repo name is required").max(LIMITS.repoName),
    description: z.string().max(LIMITS.repoDescription).default(""),
    url: z.string().url("Must be a valid URL").max(LIMITS.repoUrl),
    language: z.string().max(LIMITS.language).default(""),
    topics: z.string().max(LIMITS.topics).default(""),
    stars: z.coerce.number().int().min(0).default(0),
    forks: z.coerce.number().int().min(0).default(0),
    featured: z.coerce.boolean().default(true),
    order: z.coerce.number().int().default(0),
  }) },
  knowledge: { delegate: "knowledgeItem" as const, cap: LIMITS.maxKnowledge, schema: z.object({
    title: z.string().min(1, "Title is required").max(LIMITS.knowledgeTitle),
    description: z.string().max(LIMITS.knowledgeDescription).default(""),
    category: z.string().min(1, "Category is required").max(LIMITS.knowledgeCategory),
    icon: z.string().max(LIMITS.knowledgeIcon).default("Sparkles"),
    order: z.coerce.number().int().default(0),
  }) },
};

function get(entity: string) {
  return (entities as Record<string, (typeof entities)[keyof typeof entities]>)[entity] ?? null;
}

export async function GET(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  if (!(await isAuthed(req))) return unauthorized();
  const { entity } = await ctx.params;
  const cfg = get(entity);
  if (!cfg) return Response.json({ error: "Unknown entity" }, { status: 404 });
  const delegate = db[cfg.delegate] as unknown as LooseDelegate;
  const items = await delegate.findMany({ orderBy: [{ order: "asc" }] });
  return Response.json({ items });
}

export async function POST(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  if (!(await isAuthed(req))) return unauthorized();
  const tooBig = guardBodySize(req, MAX_BODY_BYTES);
  if (tooBig) return tooBig;
  const { entity } = await ctx.params;
  const cfg = get(entity);
  if (!cfg) return Response.json({ error: "Unknown entity" }, { status: 404 });
  try {
    const data = cfg.schema.parse(await req.json());
    const delegate = db[cfg.delegate] as unknown as LooseDelegate;
    const count = await delegate.count();
    if (count >= cfg.cap) {
      return Response.json(
        { error: `Limit reached — this section holds at most ${cfg.cap} items.` },
        { status: 400 },
      );
    }
    const item = await delegate.create({ data });
    invalidatePortfolioCache();
    return Response.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error(`${entity} POST failed`, err);
    return Response.json({ error: "Failed to create item" }, { status: 500 });
  }
}
