import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { skillIconSchema } from "@/lib/skill-icon-schema";

export const dynamic = "force-dynamic";

type LooseDelegate = {
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

const entities = {
  skills: { delegate: "skill" as const, schema: z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    level: z.coerce.number().int().min(0).max(100).optional(),
    order: z.coerce.number().int().optional(),
    icon: skillIconSchema.optional(),
  }) },
  experiences: { delegate: "experience" as const, schema: z.object({
    company: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    period: z.string().min(1).optional(),
    description: z.string().optional(),
    tech: z.string().optional(),
    current: z.coerce.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }) },
  repos: { delegate: "repo" as const, schema: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    url: z.string().url("Must be a valid URL").optional(),
    language: z.string().optional(),
    stars: z.coerce.number().int().min(0).optional(),
    forks: z.coerce.number().int().min(0).optional(),
    featured: z.coerce.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }) },
  knowledge: { delegate: "knowledgeItem" as const, schema: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().min(1).optional(),
    icon: z.string().optional(),
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
  const { entity, id } = await ctx.params;
  const cfg = get(entity);
  if (!cfg) return Response.json({ error: "Unknown entity" }, { status: 404 });
  try {
    const data = cfg.schema.parse(await req.json());
    const delegate = db[cfg.delegate] as unknown as LooseDelegate;
    const item = await delegate.update({ where: { id }, data });
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
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`${entity} DELETE failed`, err);
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
