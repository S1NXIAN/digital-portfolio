import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { invalidatePortfolioCache } from "@/lib/portfolio-cache";
import { guardBodySize } from "@/lib/rate-limit";
import { LIMITS, MAX_BODY_BYTES } from "@/lib/limits";
import { skillIconSchema } from "@/lib/skill-icon-schema";

export const dynamic = "force-dynamic";

type LooseDelegate = {
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

const entities = {
  skills: { delegate: "skill" as const, schema: z.object({
    name: z.string().min(1).max(LIMITS.skillName).optional(),
    category: z.string().min(1).max(LIMITS.skillCategory).optional(),
    level: z.coerce.number().int().min(0).max(100).optional(),
    order: z.coerce.number().int().optional(),
    icon: skillIconSchema.optional(),
  }) },
  experiences: { delegate: "experience" as const, schema: z.object({
    company: z.string().min(1).max(LIMITS.company).optional(),
    role: z.string().min(1).max(LIMITS.role).optional(),
    period: z.string().min(1).max(LIMITS.period).optional(),
    description: z.string().max(LIMITS.experienceDescription).optional(),
    tech: z.string().max(LIMITS.tech).optional(),
    current: z.coerce.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }) },
  repos: { delegate: "repo" as const, schema: z.object({
    name: z.string().min(1).max(LIMITS.repoName).optional(),
    description: z.string().max(LIMITS.repoDescription).optional(),
    url: z.string().url("Must be a valid URL").max(LIMITS.repoUrl).optional(),
    language: z.string().max(LIMITS.language).optional(),
    topics: z.string().max(LIMITS.topics).optional(),
    stars: z.coerce.number().int().min(0).optional(),
    forks: z.coerce.number().int().min(0).optional(),
    featured: z.coerce.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }) },
  knowledge: { delegate: "knowledgeItem" as const, schema: z.object({
    title: z.string().min(1).max(LIMITS.knowledgeTitle).optional(),
    description: z.string().max(LIMITS.knowledgeDescription).optional(),
    category: z.string().min(1).max(LIMITS.knowledgeCategory).optional(),
    icon: z.string().max(LIMITS.knowledgeIcon).optional(),
    order: z.coerce.number().int().optional(),
  }) },
};

function get(entity: string) {
  return (entities as Record<string, (typeof entities)[keyof typeof entities]>)[entity] ?? null;
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ entity: string; id: string }> }
) {
  if (!(await isAuthed(req))) return unauthorized();
  const tooBig = guardBodySize(req, MAX_BODY_BYTES);
  if (tooBig) return tooBig;
  const { entity, id } = await ctx.params;
  const cfg = get(entity);
  if (!cfg) return Response.json({ error: "Unknown entity" }, { status: 404 });
  try {
    const data = cfg.schema.parse(await req.json());
    const delegate = db[cfg.delegate] as unknown as LooseDelegate;
    const item = await delegate.update({ where: { id }, data });
    invalidatePortfolioCache();
    return Response.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error(`${entity} PUT failed`, err);
    return Response.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ entity: string; id: string }> }
) {
  if (!(await isAuthed(req))) return unauthorized();
  const { entity, id } = await ctx.params;
  const cfg = get(entity);
  if (!cfg) return Response.json({ error: "Unknown entity" }, { status: 404 });
  try {
    const delegate = db[cfg.delegate] as unknown as LooseDelegate;
    await delegate.delete({ where: { id } });
    invalidatePortfolioCache();
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`${entity} DELETE failed`, err);
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
