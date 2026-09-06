import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const ADMIN_COOKIE = "pf_admin";

export function tokenFor(passcode: string) {
  return createHash("sha256").update(`pf::${passcode}::v1`).digest("hex");
}

export async function getPasscode() {
  const s = await db.setting.findUnique({ where: { key: "adminPasscode" } });
  return s?.value ?? "admin123";
}

export function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function isAuthed(req: Request): Promise<boolean> {
  const passcode = await getPasscode();
  const expected = tokenFor(passcode);
  return readCookie(req, ADMIN_COOKIE) === expected;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
