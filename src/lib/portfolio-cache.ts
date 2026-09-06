/**
 * Tiny in-memory cache for the public /api/portfolio payload.
 *
 * The portfolio is read on every page view but changes only when the owner
 * saves something in the admin console. Instead of hitting SQLite (5 queries)
 * on every request, we serve the last payload for PORTFOLIO_CACHE_TTL_MS and
 * invalidate eagerly from every admin write path (create/update/delete/reorder).
 *
 * The payload is serialized to a JSON string ONCE when cached — serving a
 * cache hit then becomes a zero-copy Response, instead of re-running
 * JSON.stringify over (potentially) megabytes on every request. This keeps
 * p95 flat even when the payload is large or the endpoint is flooded.
 *
 * Single-process server => a module variable is a correct, dependency-free
 * cache.
 */

const TTL_MS = Number(process.env.PORTFOLIO_CACHE_TTL_MS ?? 20_000); // 20s default

let serialized: string | null = null;
let expiresAt = 0;

export function getPortfolioCache(): string | null {
  if (!serialized) return null;
  if (Date.now() > expiresAt) {
    serialized = null;
    return null;
  }
  return serialized;
}

export function setPortfolioCache(value: unknown): void {
  serialized = JSON.stringify(value);
  expiresAt = Date.now() + TTL_MS;
}

/** Called by every admin mutation so the public site reflects changes instantly. */
export function invalidatePortfolioCache(): void {
  serialized = null;
}
