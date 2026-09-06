import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthed, unauthorized } from "@/lib/admin-auth";
import { invalidatePortfolioCache } from "@/lib/portfolio-cache";
import { guardBodySize } from "@/lib/rate-limit";
import { LIMITS, MAX_BODY_BYTES } from "@/lib/limits";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(LIMITS.name).optional(),
  headline: z.string().max(LIMITS.headline).optional(),
  bio: z.string().max(LIMITS.bio).optional(),
  motto: z.string().max(LIMITS.motto).optional(),
  photoUrl: z.string().max(LIMITS.photoUrl).optional(),
  location: z.string().max(LIMITS.location).optional(),
  email: z.string().max(LIMITS.email).optional(),
  resumeUrl: z.string().max(LIMITS.resumeUrl).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional(),
  availability: z.string().max(LIMITS.availability).optional(),
  githubUsername: z.string().max(LIMITS.githubUsername).optional(),
  socials: z
    .array(
      z.object({
        label: z.string().max(LIMITS.socialLabel),
        url: z.string().max(LIMITS.socialUrl),
        icon: z.string().max(LIMITS.socialIcon),
      }),
    )
    .max(LIMITS.socialsCount)
    .optional(),
  rotatingWords: z
    .array(z.string().max(LIMITS.rotatingWord))
    .max(LIMITS.rotatingWordsCount)
    .optional(),
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
  const tooBig = guardBodySize(req, MAX_BODY_BYTES);
  if (tooBig) return tooBig;
  try {
    const body = await req.json();
    const data = profileSchema.parse(body);
    await ensureProfile();
    const profile = await db.profile.update({ where: { id: "main" }, data });
    invalidatePortfolioCache();
    return Response.json({ profile });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error("profile PUT failed", err);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
