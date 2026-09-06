import { isAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return Response.json({ authed: await isAuthed(req) });
}
