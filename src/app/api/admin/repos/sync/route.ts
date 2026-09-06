import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { nextPhMidnightISO } from "@/lib/contributions-sync";
import {
  getReposLastRun,
  runReposSync,
} from "@/lib/repos-sync";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/repos/sync — sync status for the Repos admin tab.
 * POST /api/admin/repos/sync — run the metadata sync right now.
 *
 * Static segment wins over the [entity] dynamic route, like
 * /api/admin/contributions/sync does.
 */

export async function GET(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  const [profile, lastRun] = await Promise.all([
    db.profile.findUnique({ where: { id: "main" }, select: { githubUsername: true } }),
    getReposLastRun(),
  ]);
  return Response.json({
    username: profile?.githubUsername?.trim() ?? "",
    nextRunAt: nextPhMidnightISO(),
    lastRun,
  });
}

export async function POST(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  // Body is optional — never throw on absent/invalid JSON.
  await req.json().catch(() => null);
  try {
    const result = await runReposSync("manual");
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Repos sync failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
