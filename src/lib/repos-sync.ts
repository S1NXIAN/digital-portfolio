import { db } from "@/lib/db";
import { getGithubToken } from "@/lib/contributions-sync";
import { invalidatePortfolioCache } from "@/lib/portfolio-cache";

/**
 * GitHub repository metadata sync.
 *
 * Keeps the showcased repos fresh by pulling name, description, primary
 * language, topics, stars and forks straight from the GitHub API for the
 * username saved in the Profile:
 *   - every existing repo row whose URL points at github.com is updated
 *   - public repos that are not on the site yet are appended (unfeatured)
 *   - rows are never deleted — curating (deleting/featuring) stays manual
 *
 * Runs on demand from the Admin UI and nightly at 12:00 AM PH time from
 * src/lib/auto-sync.ts (same scheduler as the contributions sync).
 *
 * The token (env GITHUB_TOKEN or the one saved in the Admin UI) is optional
 * here — public repo data works unauthenticated, but the token lifts the
 * rate limit from 60 to 5,000 requests/hour.
 */

export const REPOS_LAST_RUN_KEY = "repos:sync:lastRun";

export type ReposSyncTrigger = "manual" | "auto";

export interface ReposLastRun {
  at: string; // ISO timestamp
  ok: boolean;
  username: string;
  trigger: ReposSyncTrigger;
  message: string;
  updated?: number;
  added?: number;
}

export interface ReposSyncResult {
  username: string;
  updated: number;
  added: number;
}

/** Fetch the last recorded run (null when never run or unreadable). */
export async function getReposLastRun(): Promise<ReposLastRun | null> {
  try {
    const row = await db.setting.findUnique({ where: { key: REPOS_LAST_RUN_KEY } });
    if (!row) return null;
    return JSON.parse(row.value) as ReposLastRun;
  } catch {
    return null;
  }
}

async function recordLastRun(run: ReposLastRun): Promise<void> {
  try {
    await db.setting.upsert({
      where: { key: REPOS_LAST_RUN_KEY },
      update: { value: JSON.stringify(run) },
      create: { key: REPOS_LAST_RUN_KEY, value: JSON.stringify(run) },
    });
  } catch {
    // settings table may not exist yet — never break the sync for this
  }
}

/**
 * Normalize a GitHub repo URL to a comparable key: `owner/repo`, lowercase,
 * no scheme/path noise. Returns null for non-GitHub or malformed URLs.
 */
function ghKey(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0].toLowerCase()}/${parts[1].toLowerCase().replace(/\.git$/, "")}`;
  } catch {
    return null;
  }
}

interface GhRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count?: number;
  forks_count?: number;
  fork?: boolean;
  archived?: boolean;
}

/** Metadata fields we mirror from GitHub onto a repo row. */
function rowMeta(gh: GhRepo) {
  return {
    name: gh.name ?? "",
    description: gh.description ?? "",
    language: gh.language ?? "",
    topics: Array.isArray(gh.topics) ? gh.topics.join(",") : "",
    stars: Math.max(0, gh.stargazers_count ?? 0),
    forks: Math.max(0, gh.forks_count ?? 0),
  };
}

function githubHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-repos-sync",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Fetch one repo's live metadata by URL — powers the editor's Pull button. */
export async function fetchSingleRepo(
  url: string
): Promise<{ name: string; description: string; language: string; topics: string; stars: number; forks: number; htmlUrl: string }> {
  const key = ghKey(url);
  if (!key) throw new Error("URL must point at a github.com repository");
  const { token } = await getGithubToken();
  const res = await fetch(`https://api.github.com/repos/${key}`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("Repository not found (is it public?)");
  if (res.status === 403 || res.status === 429) {
    throw new Error("GitHub rate limit reached — try again later or save a token in Contributions");
  }
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const gh = (await res.json()) as GhRepo;
  return { ...rowMeta(gh), htmlUrl: gh.html_url };
}

/**
 * Sync every repo row against GitHub. See the module docblock for semantics.
 * Throws with a readable message when GitHub is unreachable / rate-limited.
 */
export async function runReposSync(trigger: ReposSyncTrigger): Promise<ReposSyncResult> {
  const profile = await db.profile.findUnique({ where: { id: "main" } });
  const username = profile?.githubUsername?.trim() ?? "";
  if (!username) {
    const run: ReposLastRun = {
      at: new Date().toISOString(),
      ok: false,
      username: "",
      trigger,
      message: "No GitHub username saved in Profile",
    };
    await recordLastRun(run);
    throw new Error("No GitHub username saved in Profile — set it in the Profile tab first");
  }

  const { token } = await getGithubToken();

  // Page through the public repos (5 × 100 is far beyond any personal account).
  const ghRepos: GhRepo[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=full_name&type=owner`,
      { headers: githubHeaders(token), cache: "no-store" }
    );
    if (res.status === 404) {
      throw new Error(`GitHub user “${username}” not found`);
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error("GitHub rate limit reached — try again later or save a token in Contributions");
    }
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    const batch = (await res.json()) as GhRepo[];
    ghRepos.push(...batch);
    if (batch.length < 100) break;
  }

  const rows = await db.repo.findMany();
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = ghKey(row.url);
    if (key) byKey.set(key, row);
  }

  let updated = 0;
  const missing: { url: string; featured: boolean; order: number }[] = [];
  const newMeta: Record<string, ReturnType<typeof rowMeta>> = {};

  for (const gh of ghRepos) {
    // Skip forks — the showcase is for original work; archives stay but sync too.
    if (gh.fork) continue;
    const key = ghKey(gh.html_url);
    if (!key) continue;
    const row = byKey.get(key);
    if (row) {
      await db.repo.update({ where: { id: row.id }, data: rowMeta(gh) });
      updated += 1;
    } else {
      missing.push({ url: gh.html_url, featured: false, order: 0 });
      newMeta[gh.html_url] = rowMeta(gh);
    }
  }

  let added = 0;
  if (missing.length > 0) {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.order), -1);
    await db.repo.createMany({
      data: missing.map((m, i) => ({ ...m, ...newMeta[m.url], order: maxOrder + 1 + i })),
    });
    added = missing.length;
  }

  invalidatePortfolioCache();

  const run: ReposLastRun = {
    at: new Date().toISOString(),
    ok: true,
    username,
    trigger,
    message: `Updated ${updated} repo${updated === 1 ? "" : "s"}, added ${added}`,
    updated,
    added,
  };
  await recordLastRun(run);
  return { username, updated, added };
}

/** Fire-and-forget nightly wrapper used by the auto-sync scheduler. */
export async function runReposSyncSafe(trigger: ReposSyncTrigger): Promise<void> {
  try {
    const r = await runReposSync(trigger);
    console.log(
      `[repos-sync] OK for ${r.username}: ${r.updated} updated, ${r.added} added (${trigger})`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[repos-sync] FAILED (${trigger}): ${message}`);
  }
}
