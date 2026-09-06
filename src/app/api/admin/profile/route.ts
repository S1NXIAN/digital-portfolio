import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  motto: z.string().optional(),
  photoUrl: z.string().optional(),
  location: z.string().optional(),
  email: z.string().optional(),
  resumeUrl: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional(),
  availability: z.string().optional(),
  githubUsername: z.string().optional(),
  socials: z
    .array(z.object({ label: z.string(), url: z.string(), icon: z.string() }))
    .optional(),
  rotatingWords: z.array(z.string()).optional(),
});

async function ensureProfile() {
  await db.profile.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });
}

export async function GET(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  await ensureProfile();
  const profile = await db.profile.findUnique({ where: { id: "main" } });
  return Response.json({ profile });
}

export async function PUT(req: Request) {
  if (!(await isAuthed(req))) return unauthorized();
  try {
    const body = await req.json();
    const data = profileSchema.parse(body);
    await ensureProfile();
    const profile = await db.profile.update({ where: { id: "main" }, data });
    return Response.json({ profile });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error("profile PUT failed", err);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
