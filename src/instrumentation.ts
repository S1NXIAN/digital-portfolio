/**
 * Next.js instrumentation — runs once when the server process boots.
 *
 *  1. GitHub contributions auto-sync scheduler (12:00 AM Asia/Manila daily)
 *  2. Self-ping keep-alive (opt-in via SELF_PING_ENABLED=true)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { startAutoSyncScheduler } = await import("@/lib/auto-sync");
  startAutoSyncScheduler();

  const { startSelfPing } = await import("@/lib/self-ping");
  startSelfPing();
}
