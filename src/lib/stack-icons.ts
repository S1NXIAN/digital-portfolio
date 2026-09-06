/**
 * Shared (client-safe) skill icon resolution.
 *
 * Resolution produces a CANDIDATE LIST — <StackIcon> walks it and falls
 * through on 404/load errors, ending in a letter chip only when every
 * provider misses:
 *   1. Explicit custom URL ("https://…", "data:image/…", "/…") → used verbatim
 *   2. Curated alias (verified, brand-correct icon)
 *   3. Simple Icons — bundled locally (3,400+ tech brands), served
 *      brand-colored from /api/icons/simple/v2/[slug]. Covers dev-tool
 *      brands dashboard-icons lacks (tailwindcss, react, langchain,
 *      googlegemini, githubactions, shadcnui, gnubash, …)
 *   4. Dashboard Icons — jsDelivr CDN (infrastructure logos Simple Icons drops)
 *
 * An empty icon auto-matches from the skill name.
 */

export const DI_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";

const di = (slug: string) => `${DI_CDN_BASE}/${slug}.svg`;
/** Simple Icons are served from our own cached API route (no third-party CDN blocking). */
const si = (slug: string) => `/api/icons/simple/v2/${slug}`;

/** normalized name/slug → verified icon URL */
const ALIASES: Record<string, string> = {
  // ——— Simple Icons (bundled, brand-colored) ———
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
  anthropic: si("anthropic"),
  claude: si("anthropic"),
  googlegemini: si("googlegemini"),
  gemini: si("googlegemini"),
  langchain: si("langchain"),
  langgraph: si("langchain"),
  ollama: si("ollama"),
  shadcn: si("shadcnui"),
  shadcnui: si("shadcnui"),
  tanstack: si("tanstack"),
  tanstackquery: si("reactquery"),
  reactquery: si("reactquery"),
  pytorch: si("pytorch"),
  tensorflow: si("tensorflow"),
  huggingface: si("huggingface"),
  hf: si("huggingface"),
  mongodb: si("mongodb"),
  mongo: si("mongodb"),
  redis: si("redis"),
  kubernetes: si("kubernetes"),
  k8s: si("kubernetes"),
  grafana: si("grafana"),
  prometheus: si("prometheus"),
  cloudflare: si("cloudflare"),
  openrouter: si("openrouter"),
  pino: si("pino"),
  zod: si("zod"),
  eslint: si("eslint"),
  prettier: si("prettier"),
  vitest: si("vitest"),
  puppeteer: si("puppeteer"),
  cypress: si("cypress"),
  storybook: si("storybook"),
  webpack: si("webpack"),
  rollup: si("rollupdotjs"),
  esbuild: si("esbuild"),
  npm: si("npm"),
  pnpm: si("pnpm"),
  yarn: si("yarn"),
  websocket: si("socketdotio"),
  webrtc: si("webrtc"),
  bash: si("gnubash"),
  nvidia: si("nvidia"),
  // ——— Dashboard Icons (jsDelivr CDN) — brands Simple Icons drops or styles poorly ———
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
  docker: di("docker"),
  aws: di("aws"),
  amazonwebservices: di("aws"),
  git: di("git"),
  github: di("github"),
  gitlab: di("gitlab"),
  nextjs: di("nextjs"),
  next: di("nextjs"),
  nextdotjs: di("nextjs"),
  vercel: di("vercel"),
  nginx: di("nginx"),
  terraform: di("terraform"),
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
  laravel: di("laravel"),
  rabbitmq: di("rabbitmq"),
  elasticsearch: di("elasticsearch"),
  jenkins: di("jenkins"),
  figma: di("figma"),
  netlify: di("netlify"),
  openai: di("openai"),
  chatgpt: di("openai"),
  deno: di("deno"),
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

const push = (list: string[], url: string | null | undefined) => {
  if (url && !list.includes(url)) list.push(url);
};

/**
 * Resolve the ordered image-URL candidates for a stack item.
 * @param name   Skill name, e.g. "Prisma ORM"
 * @param icon   Explicit icon value: "" | URL | simple-icons/dashboardicons slug
 */
export function resolveStackIconCandidates(name: string, icon?: string): string[] {
  const value = (icon ?? "").trim();
  const list: string[] = [];

  if (value) {
    if (isCustomIconUrl(value)) return [value];
    if (/^[a-z0-9-]+$/i.test(value)) {
      const v = value.toLowerCase();
      push(list, ALIASES[v]);
      push(list, si(v));
      push(list, di(v));
      return list;
    }
    return list; // invalid explicit value → chip fallback
  }

  const normalized = normalizeSkillName(name);
  if (!normalized) return list;

  push(list, ALIASES[normalized]);
  push(list, si(normalized));
  push(list, di(normalized));

  // Dotted brand slugs: "Next.js" → si "nextdotjs", "three.js" → "threedotjs"
  const dotted = name.toLowerCase().match(/[a-z0-9]+(?:\.[a-z0-9]+)+/g) ?? [];
  for (const t of dotted) push(list, si(t.replace(/\./g, "dot")));

  // Significant words of multi-word names: "Prisma ORM" → "prisma"
  const words = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  for (const w of words) push(list, ALIASES[w]);

  return list;
}

/** Preferred single URL — first candidate or null (convenience wrapper). */
export function resolveStackIcon(name: string, icon?: string): string | null {
  return resolveStackIconCandidates(name, icon)[0] ?? null;
}
