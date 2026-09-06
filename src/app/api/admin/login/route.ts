import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getPasscode, tokenFor } from "@/lib/admin-auth";
import { clientKey, guardBodySize, rateLimit, rateLimitReset } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Small bodies only — the passcode is a short string, never a novel. */
const MAX_LOGIN_BODY = 4_096;
/** 10 failed attempts per 5 minutes per client, then back off. */
const MAX_ATTEMPTS = 10;

export async function POST(req: Request) {
  const tooBig = guardBodySize(req, MAX_LOGIN_BODY);
  if (tooBig) return tooBig;

  const ip = clientKey(req);
  const limit = rateLimit(`${ip}:login`, MAX_ATTEMPTS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts — try again in ${limit.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const passcode = typeof body.passcode === "string" ? body.passcode.slice(0, 201) : "";
    const expected = await getPasscode();

    if (!passcode || passcode !== expected) {
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
    }

    rateLimitReset(`${ip}:login`);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, tokenFor(expected), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error("login failed", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
