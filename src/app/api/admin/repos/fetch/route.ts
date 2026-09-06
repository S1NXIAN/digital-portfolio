import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { invalidatePortfolioCache } from "@/lib/portfolio-cache";
import { fetchSingleRepo } from "@/lib/repos-sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/repos/fetch
 * Body: { url: string } — pull live metadata for ONE GitHub repo.
 *
 * With `apply: true` the row given by `id` is updated in place; without it
 * the metadata is just returned so the editor form can be pre-filled.
 */
const bodySchema = z.object({
  url: z.string().url("Must be a valid URL"),
  id: z.string().optional(),
  apply: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const meta = await fetchSingleRepo(body.url);
    if (body.apply && body.id) {
      await db.repo.update({
        where: { id: body.id },
        data: {
          name: meta.name,
          description: meta.description,
          language: meta.language,
          topics: meta.topics,
          stars: meta.stars,
          forks: meta.forks,
        },
      });
      invalidatePortfolioCache();
    }
    return Response.json({ ok: true, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
