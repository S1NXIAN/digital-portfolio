import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { invalidatePortfolioCache } from "@/lib/portfolio-cache";
import { skillIconSchema } from "@/lib/skill-icon-schema";

export const dynamic = "force-dynamic";

type LooseDelegate = {
  findMany: (args?: { orderBy?: unknown }) => Promise<unknown[]>;
  create: (args: { data: unknown }) => Promise<unknown>;
};

const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  category: z.string().min(1, "Category is required"),
  level: z.coerce.number().int().min(0).max(100).default(80),
  order: z.coerce.number().int().default(0),
  icon: skillIconSchema,
});

const entities = {
  skills: { delegate: "skill" as const, schema: skillSchema },
  experiences: { delegate: "experience" as const, schema: z.object({
    company: z.string().min(1, "Company is required"),
    role: z.string().min(1, "Role is required"),
    period: z.string().min(1, "Period is required"),
    description: z.string().default(""),
    tech: z.string().default(""),
    current: z.coerce.boolean().default(false),
    order: z.coerce.number().int().default(0),
  }) },
  repos: { delegate: "repo" as const, schema: z.object({
    name: z.string().min(1, "Repo name is required"),
    description: z.string().default(""),
    url: z.string().url("Must be a valid URL"),
    language: z.string().default(""),
    topics: z.string().default(""),
    stars: z.coerce.number().int().min(0).default(0),
    forks: z.coerce.number().int().min(0).default(0),
    featured: z.coerce.boolean().default(true),
    order: z.coerce.number().int().default(0),
  }) },
  knowledge: { delegate: "knowledgeItem" as const, schema: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().default(""),
    category: z.string().min(1, "Category is required"),
    icon: z.string().default("Sparkles"),
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
  const { entity } = await ctx.params;
  const cfg = get(entity);
  if (!cfg) return Response.json({ error: "Unknown entity" }, { status: 404 });
  try {
    const data = cfg.schema.parse(await req.json());
    const delegate = db[cfg.delegate] as unknown as LooseDelegate;
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
