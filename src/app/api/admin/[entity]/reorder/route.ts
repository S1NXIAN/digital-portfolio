import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { invalidatePortfolioCache } from "@/lib/portfolio-cache";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/[entity]/reorder
 * Body: { ids: string[] } in the desired final order — order = array index.
 * Static segment wins over [id], so this never collides with item routes.
 */
const bodySchema = z.object({ ids: z.array(z.string()).min(1) });

const delegates: Record<string, string> = {
  skills: "skill",
  experiences: "experience",
  repos: "repo",
  knowledge: "knowledgeItem",
};

export async function PATCH(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  if (!(await isAuthed(req))) return unauthorized();
  const { entity } = await ctx.params;
  const delegateName = delegates[entity];
  if (!delegateName) return Response.json({ error: "Unknown entity" }, { status: 404 });

  try {
    const { ids } = bodySchema.parse(await req.json());
    const delegate = db[delegateName as keyof typeof db] as unknown as {
      update: (args: {
        where: { id: string };
        data: { order: number };
      }) => Prisma.PrismaPromise<unknown>;
    };
    await db.$transaction(
      ids.map((id, index) => delegate.update({ where: { id }, data: { order: index } }))
    );
    invalidatePortfolioCache();
    return Response.json({ ok: true, count: ids.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "ids must be a non-empty array of strings" }, { status: 400 });
    }
    console.error(`${entity} reorder failed`, err);
    return Response.json({ error: "Failed to reorder items" }, { status: 500 });
  }
}
