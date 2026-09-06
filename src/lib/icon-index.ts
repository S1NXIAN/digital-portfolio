/**
 * Server-side icon index for the admin icon picker.
 *
 * Merges two free icon sources (the same ones dashboardicons.com itself uses):
 *  1. Dashboard Icons (homarr-labs/dashboard-icons) — file list from `tree.json`,
 *     images served via the jsDelivr CDN.
 *  2. Simple Icons (npm `simple-icons` package) — bundled locally; brand-colored
 *     SVGs are served from our own cached route `/api/icons/simple/[slug]`.
 *
 * Dashboard Icons' file list is fetched once and kept in memory for 24 h
 * (stale-while-error). Simple Icons needs no network at all.
 */

import * as simpleIconsPkg from "simple-icons";

const DI_TREE_URL =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/tree.json";
export const DI_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";

const TTL_MS = 24 * 60 * 60 * 1000;

export interface IconResult {
  /** Human title, e.g. "Node.js" */
  name: string;
  /** "dashboard" | "simple" */
  source: "dashboard" | "simple";
  slug: string;
  /** Direct image URL usable in <img src> */
  url: string;
  /** Brand hex (simple-icons only) */
  hex?: string;
}

interface DiEntry {
  slug: string;
  /** true when the slug ends in -light / -dark (theme variants) */
  variant: boolean;
}

let diCache: { at: number; icons: DiEntry[] } | null = null;

interface SimpleIconLike {
  title: string;
  slug: string;
  hex: string;
  svg: string;
}

let siCache: IconResult[] | null = null;
let siBySlug: Map<string, SimpleIconLike> | null = null;

function loadSimpleIcons(): { list: IconResult[]; bySlug: Map<string, SimpleIconLike> } {
  if (siCache && siBySlug) return { list: siCache, bySlug: siBySlug };
  const list: IconResult[] = [];
  const bySlug = new Map<string, SimpleIconLike>();
  for (const value of Object.values(
    simpleIconsPkg as unknown as Record<string, unknown>
  )) {
    const icon = value as Partial<SimpleIconLike>;
    if (
      typeof icon?.title === "string" &&
      typeof icon?.slug === "string" &&
      typeof icon?.hex === "string" &&
      typeof icon?.svg === "string"
    ) {
      const entry: SimpleIconLike = {
        title: icon.title,
        slug: icon.slug,
        hex: icon.hex,
        svg: icon.svg,
      };
      bySlug.set(entry.slug, entry);
      list.push({
        name: entry.title,
        source: "simple",
        slug: entry.slug,
        url: `/api/icons/simple/${entry.slug}`,
        hex: entry.hex,
      });
    }
  }
  siCache = list;
  siBySlug = bySlug;
  return { list, bySlug };
}

export function getSimpleIconSvg(slug: string): string | null {
  const { bySlug } = loadSimpleIcons();
  return bySlug.get(slug.toLowerCase())?.svg ?? null;
}

async function loadDashboardIcons(): Promise<DiEntry[]> {
  if (diCache && Date.now() - diCache.at < TTL_MS) return diCache.icons;
  try {
    const res = await fetch(DI_TREE_URL, {
      next: { revalidate: TTL_MS / 1000 },
    });
    if (!res.ok) throw new Error(`tree.json ${res.status}`);
    const tree = (await res.json()) as Record<string, string[]>;
    const icons: DiEntry[] = (tree.svg ?? [])
      .map((f) => f.replace(/\.svg$/, ""))
      .filter((s) => /^[a-z0-9-]+$/.test(s))
      .map((slug) => ({
        slug,
        variant: slug.endsWith("-light") || slug.endsWith("-dark"),
      }));
    if (icons.length > 0) diCache = { at: Date.now(), icons };
    return icons;
  } catch {
    return diCache?.icons ?? [];
  }
}

/** Lowercase, strip everything that is not a letter/digit — "Node.js" → "nodejs". */
function norm(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function searchIcons(
  rawQuery: string,
  limit = 30
): Promise<{ items: IconResult[]; total: number }> {
  const q = norm(rawQuery).slice(0, 40);
  if (q.length < 2) return { items: [], total: 0 };

  const [di, si] = await Promise.all([
    loadDashboardIcons(),
    Promise.resolve(loadSimpleIcons().list),
  ]);

  const scored: { item: IconResult; score: number }[] = [];

  // Dashboard Icons: match on slug + de-hyphenated key
  for (const { slug, variant } of di) {
    if (variant && !rawQuery.includes("-")) continue; // hide theme variants unless explicitly searched
    const key = norm(slug);
    let score = 0;
    if (key === q) score = 100;
    else if (key.startsWith(q)) score = 80 - Math.min(key.length - q.length, 20);
    else if (key.includes(q)) score = 55;
    if (score > 0) {
      scored.push({
        item: {
          name: slug,
          source: "dashboard",
          slug,
          url: `${DI_CDN_BASE}/${slug}.svg`,
        },
        score: score + 4, // slight priority over simple-icons
      });
    }
  }

  // Simple Icons: match on title + slug
  for (const icon of si) {
    const keys = new Set([norm(icon.slug), norm(icon.name)]);
    let score = 0;
    for (const key of keys) {
      if (key === q) score = Math.max(score, 100);
      else if (key.startsWith(q))
        score = Math.max(score, 80 - Math.min(key.length - q.length, 20));
      else if (key.includes(q)) score = Math.max(score, 55);
    }
    if (score > 0) scored.push({ item: icon, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name)
  );

  // Dedupe by URL, keep ranked order, cap
  const seen = new Set<string>();
  const items: IconResult[] = [];
  for (const { item } of scored) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    items.push(item);
    if (items.length >= limit) break;
  }
  return { items, total: scored.length };
}

/** Check whether a dashboard-icons slug actually exists (used to validate slugs typed by hand). */
export async function isValidDashboardSlug(slug: string): Promise<boolean> {
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  const di = await loadDashboardIcons();
  return di.some((i) => i.slug === slug);
}
