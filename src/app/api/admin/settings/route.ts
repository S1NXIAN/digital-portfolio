import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const changeSchema = z.object({
  currentPasscode: z.string().min(1),
  newPasscode: z.string().min(4, "New passcode must be at least 4 characters"),
});

export async function GET(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  const s = await db.setting.findUnique({ where: { key: "adminPasscode" } });
  return Response.json({ hasPasscode: Boolean(s) });
}

export async function PUT(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  try {
    const { currentPasscode, newPasscode } = changeSchema.parse(await req.json());
    const existing = await db.setting.findUnique({ where: { key: "adminPasscode" } });
    const current = existing?.value ?? "admin123";
    if (currentPasscode !== current) {
      return Response.json({ error: "Current passcode is incorrect" }, { status: 400 });
    }
    await db.setting.upsert({
      where: { key: "adminPasscode" },
      update: { value: newPasscode },
      create: { key: "adminPasscode", value: newPasscode },
    });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error("settings PUT failed", err);
    return Response.json({ error: "Failed to update passcode" }, { status: 500 });
  }
}
