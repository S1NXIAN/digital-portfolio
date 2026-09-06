/**
 * Shared (client-safe) skill icon resolution.
 *
 * Priority:
 *   1. Explicit custom URL ("https://…", "http://…", "data:image/…") → used verbatim
 *   2. Explicit dashboardicons.com slug → jsDelivr CDN svg
 *   3. Auto-match from the skill name via a curated alias map (verified slugs),
 *      falling back to a direct kebab-case dashboard-icons slug guess.
 *
 * Anything that fails to load is handled by <StackIcon>'s letter-chip fallback.
 */

export const DI_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";

const di = (slug: string) => `${DI_CDN_BASE}/${slug}.svg`;
/** Simple Icons are served from our own cached API route (no third-party CDN blocking). */
const si = (slug: string) => `/api/icons/simple/${slug}`;

/** normalized name → verified icon URL */
const ALIASES: Record<string, string> = {
  // ——— Dashboard Icons (jsDelivr CDN) ———
  javascript: di("javascript"),
  js: di("javascript"),
  typescript: di("typescript"),
  ts: di("typescript"),
  python: di("python"),
  node: di("nodejs"),
  nodejs: di("nodejs"),
  postgres: di("postgresql"),
  postgresql: di("postgresql"),
  psql: di("postgresql"),
  redis: di("redis"),
  docker: di("docker"),
  aws: di("aws"),
  amazonwebservices: di("aws"),
  amazonwebserviceslight: di("aws"),
  git: di("git"),
  github: di("github"),
  gitlab: di("gitlab"),
  nextjs: di("nextjs"),
  next: di("nextjs"),
  vercel: di("vercel"),
  nginx: di("nginx"),
  kubernetes: di("kubernetes"),
  k8s: di("kubernetes"),
  terraform: di("terraform"),
  mongo: di("mongodb"),
  mongodb: di("mongodb"),
  mysql: di("mysql"),
  firebase: di("firebase"),
  supabase: di("supabase"),
  golang: di("go"),
  go: di("go"),
  rust: di("rust"),
  php: di("php"),
  java: di("java"),
  kotlin: di("kotlin"),
  swift: di("swift"),
  dart: di("dart"),
  svelte: di("svelte"),
  vite: di("vite"),
  vitest: di("vitest"),
  grafana: di("grafana"),
  prometheus: di("prometheus"),
  linux: di("linux"),
  laravel: di("laravel"),
  rabbitmq: di("rabbitmq"),
  elasticsearch: di("elasticsearch"),
  jenkins: di("jenkins"),
  figma: di("figma"),
  cloudflare: di("cloudflare"),
  netlify: di("netlify"),
  openai: di("openai"),
  deno: di("deno"),
  // ——— Simple Icons (brand-colored CDN) ———
  react: si("react"),
  reactjs: si("react"),
  tailwind: si("tailwindcss"),
  tailwindcss: si("tailwindcss"),
  graphql: si("graphql"),
  prisma: si("prisma"),
  prismaorm: si("prisma"),
  vue: si("vuedotjs"),
  vuejs: si("vuedotjs"),
  express: si("express"),
  expressjs: si("express"),
  nest: si("nestjs"),
  nestjs: si("nestjs"),
  flutter: si("flutter"),
  astro: si("astro"),
  redux: si("redux"),
  framer: si("framer"),
  framermotion: si("framer"),
  motion: si("framer"),
  jest: si("jest"),
  bun: si("bun"),
  three: si("threedotjs"),
  threejs: si("threedotjs"),
  d3: si("d3"),
  d3js: si("d3"),
  socketio: si("socketdotio"),
  socketdotio: si("socketdotio"),
  django: si("django"),
  flask: si("flask"),
  spring: si("spring"),
  springboot: si("spring"),
  postman: si("postman"),
  auth0: si("auth0"),
  stripe: si("stripe"),
  trpc: si("trpc"),
  fastify: si("fastify"),
  hono: si("hono"),
  sass: si("sass"),
  cicd: si("githubactions"),
  githubactions: si("githubactions"),
  actions: si("githubactions"),
};

/** "JavaScript (ES2024)" → "javascript" · "Node.js" → "nodejs" · "CI/CD" → "cicd" */
export function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop parenthesized qualifiers
    .replace(/[^a-z0-9]/g, "");
}

export function isCustomIconUrl(value: string): boolean {
  return /^(https?:\/\/|data:image\/)/i.test(value.trim()) || value.trim().startsWith("/");
}

/**
 * Resolve the image URL for a stack item.
 * @param name   Skill name, e.g. "Prisma ORM"
 * @param icon   Explicit icon value: "" | URL | dashboardicons slug
 * @returns image URL, or null when nothing sensible can be guessed
 */
export function resolveStackIcon(name: string, icon?: string): string | null {
  const value = (icon ?? "").trim();

  if (value) {
    if (isCustomIconUrl(value)) return value;
    if (/^[a-z0-9-]+$/i.test(value)) return di(value.toLowerCase());
    return null; // invalid explicit value → chip fallback
  }

  const normalized = normalizeSkillName(name);
  if (!normalized) return null;

  if (ALIASES[normalized]) return ALIASES[normalized];

  // Try the significant words of multi-word names: "Prisma ORM" → "prisma"
  const words = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  for (const w of words) {
    if (ALIASES[w]) return ALIASES[w];
  }

  // Last resort: guess a kebab-case dashboard-icons slug (letter-chip fallback covers 404s)
  if (/^[a-z0-9]+$/.test(normalized) && normalized.length >= 2) {
    return di(normalized);
  }
  return null;
}
