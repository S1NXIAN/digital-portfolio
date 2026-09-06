/**
 * Tiny in-memory sliding-window rate limiter for auth endpoints.
 * Single-process server (SQLite + one Node process) => a module Map is a
 * correct, dependency-free choice — same reasoning as portfolio-cache.
 */

const buckets = new Map<string, number[]>();

/** Evict stale buckets opportunistically to keep memory flat. */
function sweep(now: number, windowMs: number) {
  if (buckets.size < 512) return;
  for (const [key, hits] of buckets) {
    if (hits.every((t) => now - t > windowMs)) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

/**
 * Record one attempt for `key` (usually client IP). Returns ok=false once
 * more than `max` attempts happened within the window.
 */
export function rateLimit(key: string, max = 10, windowMs = 5 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    const oldest = hits[0] ?? now;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSec: 0 };
}

/** Clear the window for a key (e.g. after a successful login). */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}

/** Best-effort client IP from proxy headers / socket info. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

/**
 * Reject oversized bodies before JSON.parse. Returns null when the body is
 * within budget, otherwise a ready-to-return 413 Response.
 */
export function guardBodySize(req: Request, maxBytes: number): Response | null {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) {
    return Response.json(
      { error: "Payload too large — shorten the content and try again." },
      { status: 413 },
    );
  }
  return null;
}
