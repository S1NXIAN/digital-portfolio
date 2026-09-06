import { z } from "zod";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import {
  SyncError,
  getGithubToken,
  getLastRun,
  nextPhMidnightISO,
  runContributionsSync,
  setGithubToken,
} from "@/lib/contributions-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const syncSchema = z.object({
  username: z.string().min(1, "GitHub username is required").max(100),
});

const tokenSchema = z.object({
  // empty string clears the stored token
  token: z.string().max(200),
});

/** Sync the contribution calendar from GitHub GraphQL (includes private commits for the token owner). */
export async function POST(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  try {
    const body = await req.json().catch(() => null); // malformed/empty body → 400, not 500
    const { username } = syncSchema.parse(body);
    const result = await runContributionsSync(username, "manual");
    return Response.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    if (err instanceof SyncError) {
      return Response.json({ error: err.message, hint: err.hint }, { status: err.status });
    }
    console.error("contributions sync failed", err);
    return Response.json(
      { error: "Sync failed unexpectedly. Check the server logs." },
      { status: 500 }
    );
  }
}

/** Sync status for the admin UI. */
export async function GET(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  const { token, source } = await getGithubToken();
  const lastRun = await getLastRun();
  return Response.json({
    tokenConfigured: !!token,
    tokenSource: source,
    lastRun,
    nextRunAt: nextPhMidnightISO(),
    schedule: "Daily at 12:00 AM Philippine time (Asia/Manila)",
  });
}

/** Save or clear the GitHub token (empty string clears). */
export async function PUT(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  try {
    const { token } = tokenSchema.parse(await req.json());
    await setGithubToken(token);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error("token save failed", err);
    return Response.json({ error: "Could not save the token." }, { status: 500 });
  }
}
