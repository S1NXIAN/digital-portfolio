import { db } from "@/lib/db";
import { msUntilNextPhMidnight, runContributionsSync } from "@/lib/contributions-sync";
import { runReposSyncSafe } from "@/lib/repos-sync";

/**
 * Nightly GitHub auto-sync — runs every day at 12:00 AM Philippine time
 * (Asia/Manila, +90s buffer so GitHub has finished aggregating the day).
 *
 * Registered once per server process from src/instrumentation.ts.
 * Uses the GitHub username saved in the Profile row; the token comes from
 * getGithubToken() (env GITHUB_TOKEN, or the token saved in the Admin UI).
 */

const globalForScheduler = globalThis as unknown as {
  __pfAutoSyncStarted?: boolean;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function tick(): Promise<void> {
  const profile = await db.profile.findUnique({ where: { id: "main" } });
  const username = profile?.githubUsername?.trim();
  if (!username) {
    console.warn("[auto-sync] skipped — no githubUsername saved in Profile");
    return;
  }
  try {
    const r = await runContributionsSync(username, "auto");
    console.log(
      `[auto-sync] OK for ${username}: ${r.synced} days, ${r.total} contributions (private ${
        r.privateIncluded ? "included" : "NOT included — token owner ≠ username"
      })`
    );
  } catch (err) {
    // runContributionsSync already recorded the failure in the DB
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[auto-sync] FAILED for ${username}: ${message}`);
  }

  // Repo metadata (name / description / language / stars / forks / topics)
  // rides the same midnight tick — runs right after the contributions sync.
  await runReposSyncSafe("auto");
}

export function startAutoSyncScheduler(): void {
  if (globalForScheduler.__pfAutoSyncStarted) return;
  globalForScheduler.__pfAutoSyncStarted = true;

  void (async () => {
    while (true) {
      const waitMs = msUntilNextPhMidnight(90);
      const h = Math.floor(waitMs / 3_600_000);
      const m = Math.round((waitMs % 3_600_000) / 60_000);
      console.log(`[auto-sync] next GitHub sync at 12:00 AM Asia/Manila (in ${h}h ${m}m)`);
      await sleep(waitMs);
      try {
        await tick();
      } catch (err) {
        console.error("[auto-sync] tick error", err);
      }
    }
  })();
}
