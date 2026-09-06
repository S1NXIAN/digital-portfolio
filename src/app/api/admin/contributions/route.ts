import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  count: z.coerce.number().int().min(0).max(500),
  note: z.string().optional(),
  mode: z.enum(["set", "add"]).default("set"), // "add" accumulates on top of existing (e.g. private commits)
});

export async function GET(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 400), 731);
  const entries = await db.contribution.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });
  return Response.json({ entries });
}

// Upsert one day — used for private commit adjustments
export async function POST(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  try {
    const data = entrySchema.parse(await req.json());
    const existing = await db.contribution.findUnique({ where: { date: data.date } });
    const count =
      data.mode === "add" && existing ? Math.min(existing.count + data.count, 500) : data.count;

    const entry = await db.contribution.upsert({
      where: { date: data.date },
      update: { count, note: data.note ?? existing?.note ?? "" },
      create: { date: data.date, count, note: data.note ?? "" },
    });
    return Response.json({ entry });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error("contributions POST failed", err);
    return Response.json({ error: "Failed to save contribution" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  const date = new URL(req.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date query param (YYYY-MM-DD) required" }, { status: 400 });
  }
  await db.contribution.deleteMany({ where: { date } });
  return Response.json({ ok: true });
}
