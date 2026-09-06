/**
 * Self-ping keep-alive.
 *
 * Free hosting tiers (e.g. Render free web services) spin the app down after
 * ~15 minutes without inbound traffic. This script pings the app's own health
 * endpoint on an interval so the instance stays warm.
 *
 * Toggle via environment variables:
 *   SELF_PING_ENABLED=true        → turn the pinger on ("true" only)
 *   SELF_PING_INTERVAL_MIN=14     → minutes between pings (default 14)
 *   SELF_PING_URL=                → optional explicit target. On Render it
 *                                    defaults to $RENDER_EXTERNAL_URL/api so
 *                                    pings count as real external traffic;
 *                                    otherwise http://127.0.0.1:$PORT/api
 *
 * Registered from src/instrumentation.ts.
 */

const globalForPing = globalThis as unknown as { __pfSelfPingStarted?: boolean };

export function startSelfPing(): void {
  if (globalForPing.__pfSelfPingStarted) return;
  if (process.env.SELF_PING_ENABLED !== "true") return;
  globalForPing.__pfSelfPingStarted = true;

  const minutes = Math.max(1, Number(process.env.SELF_PING_INTERVAL_MIN ?? 14) || 14);
  const port = process.env.PORT ?? "3000";
  const external = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, "");
  const target =
    process.env.SELF_PING_URL?.trim() ||
    (external ? `${external}/api` : null) ||
    `http://127.0.0.1:${port}/api`;

  const ping = async () => {
    try {
      const res = await fetch(target, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      console.log(`[self-ping] ${res.status} ${target}`);
    } catch (err) {
      console.warn(
        `[self-ping] failed for ${target}:`,
        err instanceof Error ? err.message : err
      );
    }
  };

  console.log(`[self-ping] enabled — every ${minutes} min → ${target}`);
  void ping();
  setInterval(() => void ping(), minutes * 60_000).unref?.();
}
