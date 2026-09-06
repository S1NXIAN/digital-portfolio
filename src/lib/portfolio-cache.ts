/**
 * Tiny in-memory cache for the public /api/portfolio payload.
 *
 * The portfolio is read on every page view but changes only when the owner
 * saves something in the admin console. Instead of hitting SQLite (5 queries)
 * on every request, we serve the last payload for PORTFOLIO_CACHE_TTL_MS and
 * invalidate eagerly from every admin write path (create/update/delete/reorder).
 *
 * Single-process server => a module Map is a correct, dependency-free cache.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = Number(process.env.PORTFOLIO_CACHE_TTL_MS ?? 20_000); // 20s default

type PortfolioPayload = unknown;
let entry: CacheEntry<PortfolioPayload> | null = null;

export function getPortfolioCache(): PortfolioPayload | null {
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    entry = null;
    return null;
  }
  return entry.value;
}

export function setPortfolioCache(value: PortfolioPayload): void {
  entry = { value, expiresAt: Date.now() + TTL_MS };
}

/** Called by every admin mutation so the public site reflects changes instantly. */
export function invalidatePortfolioCache(): void {
  entry = null;
}
