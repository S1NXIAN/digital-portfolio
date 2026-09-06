import { db } from "@/lib/db";

/**
 * GitHub contributions sync core.
 *
 * Uses the GitHub GraphQL API (`contributionsCollection.contributionCalendar`),
 * which — when queried with the OWNER's own token — includes PRIVATE
 * contributions. A token is required: unauthenticated/calendar APIs are either
 * rate-limited per IP, public-only, or unreachable from the host.
 *
 * The token can come from (in order):
 *   1. `GITHUB_TOKEN` env var (.env) — takes precedence
 *   2. `Setting` row `sync:githubToken` — saved from the Admin UI
 */

export const SYNC_TOKEN_KEY = "sync:githubToken";
export const SYNC_LAST_RUN_KEY = "sync:lastRun";

/** Owner's timezone for the nightly auto-sync. */
export const AUTO_SYNC_TZ = "Asia/Manila";

/**
 * Milliseconds from now until the next 00:00 (Asia/Manila) + a small buffer,
 * so GitHub has finished aggregating the day that just ended.
 */
export function msUntilNextPhMidnight(bufferSec = 90): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: AUTO_SYNC_TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const secOfDay = get("hour") * 3600 + get("minute") * 60 + get("second");
  const DAY = 86_400;
  return (DAY - secOfDay + bufferSec) * 1000;
}

/** ISO timestamp of the next scheduled auto-sync. */
export function nextPhMidnightISO(): string {
  return new Date(Date.now() + msUntilNextPhMidnight()).toISOString();
}

export type SyncTrigger = "manual" | "auto";

export interface SyncLastRun {
  at: string; // ISO timestamp
  ok: boolean;
  username: string;
  trigger: SyncTrigger;
  message: string;
  synced?: number;
  total?: number;
  privateIncluded?: boolean;
}

export interface SyncDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SyncResult {
  username: string;
  synced: number;
  total: number;
  privateIncluded: boolean;
}

export class SyncError extends Error {
  status: number;
  hint?: string;
  constructor(message: string, status = 502, hint?: string) {
    super(message);
    this.name = "SyncError";
    this.status = status;
    this.hint = hint;
  }
}

/* ------------------------------- token ------------------------------- */

export async function getGithubToken(): Promise<{ token: string; source: "env" | "db" | "none" }> {
  const envToken = process.env.GITHUB_TOKEN?.trim();
  if (envToken) return { token: envToken, source: "env" };
  try {
    const row = await db.setting.findUnique({ where: { key: SYNC_TOKEN_KEY } });
    const dbToken = row?.value?.trim();
    if (dbToken) return { token: dbToken, source: "db" };
  } catch {
    // table may not exist yet — treat as none
  }
  return { token: "", source: "none" };
}

export async function setGithubToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed) {
    await db.setting.upsert({
      where: { key: SYNC_TOKEN_KEY },
      update: { value: trimmed },
      create: { key: SYNC_TOKEN_KEY, value: trimmed },
    });
  } else {
    await db.setting.deleteMany({ where: { key: SYNC_TOKEN_KEY } });
  }
}

/* ------------------------------ last run ----------------------------- */

export async function getLastRun(): Promise<SyncLastRun | null> {
  try {
    const row = await db.setting.findUnique({ where: { key: SYNC_LAST_RUN_KEY } });
    if (!row) return null;
    return JSON.parse(row.value) as SyncLastRun;
  } catch {
    return null;
  }
}

async function recordLastRun(run: SyncLastRun): Promise<void> {
  try {
    await db.setting.upsert({
      where: { key: SYNC_LAST_RUN_KEY },
      update: { value: JSON.stringify(run) },
      create: { key: SYNC_LAST_RUN_KEY, value: JSON.stringify(run) },
    });
  } catch (err) {
    console.error("[sync] failed to record last-run status", err);
  }
}

/* ------------------------------ GraphQL ------------------------------ */

const CALENDAR_QUERY = /* GraphQL */ `
  query ($login: String!) {
    viewer {
      login
    }
    user(login: $login) {
      login
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

interface CalendarResponse {
  data?: {
    viewer?: { login?: string };
    user?: {
      login?: string;
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions?: number;
          weeks?: {
            contributionDays?: { date?: string; contributionCount?: number }[];
          }[];
        };
      };
    };
  };
  errors?: { type?: string; message?: string }[];
  message?: string;
}

async function fetchContributionCalendar(
  username: string,
  token: string
): Promise<{ days: SyncDay[]; totalFromGithub: number; privateIncluded: boolean }> {
  let res: Response;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "User-Agent": "portfolio-heatmap-sync",
      },
      body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login: username } }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "network error";
    throw new SyncError(
      "Could not reach api.github.com (network error).",
      502,
      reason
    );
  }

  if (res.status === 401) {
    throw new SyncError(
      "GitHub rejected the token (401 Unauthorized) — it is invalid or expired.",
      401,
      "Create a fresh classic token with the read:user scope and save it again."
    );
  }
  if (res.status === 403 || res.status === 429) {
    throw new SyncError(
      "GitHub API rate limit / forbidden (403).",
      429,
      "Wait for the rate limit to reset, or use a token with read:user scope (5,000 req/hr)."
    );
  }
  if (!res.ok) {
    throw new SyncError(`GitHub API returned HTTP ${res.status}.`, 502);
  }

  let json: CalendarResponse;
  try {
    json = (await res.json()) as CalendarResponse;
  } catch {
    throw new SyncError("GitHub API returned an unreadable response.", 502);
  }

  const gqlError = json.errors?.[0];
  if (gqlError?.type === "NOT_FOUND") {
    throw new SyncError(
      `GitHub user "${username}" was not found. Check the username.`,
      404
    );
  }
  if (gqlError) {
    throw new SyncError(
      `GitHub GraphQL error: ${gqlError.message ?? "unknown"}.`,
      502
    );
  }

  const user = json.data?.user;
  if (!user) {
    throw new SyncError(
      `GitHub user "${username}" was not found. Check the username.`,
      404
    );
  }

  const calendar = user.contributionsCollection?.contributionCalendar;
  const weeks = calendar?.weeks ?? [];
  const days: SyncDay[] = weeks
    .flatMap((w) => w.contributionDays ?? [])
    .filter((d) => typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .map((d) => ({ date: d.date as string, count: Math.max(0, d.contributionCount ?? 0) }));

  if (days.length === 0) {
    throw new SyncError(
      `GitHub returned an empty contribution calendar for "${username}".`,
      404,
      "New accounts may have no calendar yet."
    );
  }

  // Private contributions are only visible when the token owner IS the user.
  const viewer = json.data?.viewer?.login?.toLowerCase();
  const privateIncluded = !!viewer && viewer === user.login?.toLowerCase();

  return {
    days,
    totalFromGithub: calendar?.totalContributions ?? days.reduce((a, d) => a + d.count, 0),
    privateIncluded,
  };
}

/* ------------------------------ sync run ----------------------------- */

/**
 * Fetch the last-year calendar from GitHub GraphQL and upsert every day into
 * the Contribution table. Manual notes ("private repo work", …) are preserved;
 * day COUNTS are overwritten with the authoritative GitHub values.
 */
export async function runContributionsSync(
  username: string,
  trigger: SyncTrigger = "manual"
): Promise<SyncResult> {
  const cleanUser = username.trim();
  if (!cleanUser) throw new SyncError("GitHub username is required.", 400);

  const { token, source } = await getGithubToken();
  if (!token) {
    const message =
      "No GitHub token configured — sync needs one to read the contribution calendar (including private commits).";
    const hint =
      "Admin → Contributions → “GitHub token” (paste a classic token with read:user scope), or set GITHUB_TOKEN in .env and restart.";
    await recordLastRun({
      at: new Date().toISOString(),
      ok: false,
      username: cleanUser,
      trigger,
      message: `${message} ${hint}`,
    });
    throw new SyncError(message, 400, hint);
  }

  try {
    const { days, privateIncluded } = await fetchContributionCalendar(cleanUser, token);

    let synced = 0;
    let total = 0;
    await db.$transaction(async (tx) => {
      for (const day of days) {
        const count = Math.min(day.count, 500);
        total += count;
        await tx.contribution.upsert({
          where: { date: day.date },
          update: { count }, // keeps any manual note on the day
          create: { date: day.date, count, note: "" },
        });
        synced++;
      }
    });

    const result: SyncResult = { username: cleanUser, synced, total, privateIncluded };
    await recordLastRun({
      at: new Date().toISOString(),
      ok: true,
      username: cleanUser,
      trigger,
      message: privateIncluded
        ? `Synced ${synced} days · ${total} contributions (private included) · token: ${source}`
        : `Synced ${synced} days · ${total} PUBLIC contributions (token owner ≠ ${cleanUser}, private not visible) · token: ${source}`,
      synced,
      total,
      privateIncluded,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    const hint = err instanceof SyncError ? err.hint : undefined;
    await recordLastRun({
      at: new Date().toISOString(),
      ok: false,
      username: cleanUser,
      trigger,
      message: hint ? `${message} (${hint})` : message,
    });
    throw err;
  }
}
