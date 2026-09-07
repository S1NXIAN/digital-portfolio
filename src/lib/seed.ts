/**
 * Shared seed logic — populates the portfolio database.
 *
 * Used in two places:
 *  1. `bun run db:seed` (scripts/seed.ts) — force reseed
 *  2. Boot-time auto-heal (instrumentation.ts → ensureSeeded) — seeds only
 *     when the DB is empty, so a wiped/missing database never breaks the site.
 *
 * The content constants below are also imported by
 * scripts/reseed-content.ts, which re-applies profile/skills/experience/
 * knowledge/repos content to a LIVE database without touching settings
 * (GitHub token), contributions or the admin passcode.
 */
import type { PrismaClient } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  Content — Joshua Deaño · LLM Engineer · Iloilo, PH                */
/* ------------------------------------------------------------------ */

export const SEED_PROFILE = {
  id: "main",
  name: "Joshua Deaño",
  headline: "LLM Engineer",
  bio: "I'm an LLM engineer from Iloilo, Philippines — a student by day, freelancer by night, and almost everything I build flows through large language models. I treat prompts like APIs and context windows like scarce memory: structured, measured, deliberate. Two years of shipping school projects, client work and late-night experiments — with Git and Docker keeping the chaos reproducible. I'm unreasonably serious about micro-optimizations, interactions and design: the 1px offsets, the easing curves, the milliseconds nobody notices but everybody feels.",
  motto: "Build what matters.",
  photoUrl: "/avatar.png",
  location: "Iloilo, PH",
  email: "xian.mainz@proton.me",
  resumeUrl: "",
  yearsExperience: 2,
  availability: "Open for freelance",
  githubUsername: "S1NXIAN",
  socials: [
    { label: "GitHub", url: "https://github.com/S1NXIAN", icon: "Github" },
    { label: "Instagram", url: "https://instagram.com/_s1nxian", icon: "Instagram" },
    {
      label: "Facebook",
      url: "https://www.facebook.com/search/top?q=Joshua%20Dea%C3%B1o",
      icon: "Facebook",
    },
    { label: "Email", url: "mailto:xian.mainz@proton.me", icon: "Mail" },
  ],
  rotatingWords: [
    "LLM Engineer",
    "AI-Native Builder",
    "Student & Freelancer",
    "Micro-Optimization Freak",
  ],
};

/**
 * Skill icon semantics: "" = auto-match from the name via simple-icons /
 * dashboardicons, "https://…" = custom image URL, "slug" = icon slug
 * (simple-icons or dashboardicons; both providers are tried). See src/lib/stack-icons.ts.
 */
export const SEED_SKILLS: {
  name: string;
  category: string;
  order: number;
  icon?: string;
}[] = [
  // AI & LLM — the core of how I work
  { name: "Prompt Engineering", category: "AI & LLM", order: 0 },
  { name: "Context Engineering", category: "AI & LLM", order: 1 },
  { name: "Structured Outputs", category: "AI & LLM", order: 2 },
  { name: "RAG Pipelines", category: "AI & LLM", order: 3 },
  { name: "AI Agents", category: "AI & LLM", order: 4 },

  // Design & Motion — the obsession
  { name: "Micro-interactions", category: "Design & Motion", order: 0 },
  { name: "Tailwind CSS", category: "Design & Motion", order: 1, icon: "tailwindcss" },
  { name: "Framer Motion", category: "Design & Motion", order: 2, icon: "framermotion" },
  { name: "Figma", category: "Design & Motion", order: 3, icon: "figma" },

  // Frontend
  { name: "Next.js", category: "Frontend", order: 0, icon: "nextjs" },
  { name: "React", category: "Frontend", order: 1, icon: "react" },
  { name: "shadcn/ui", category: "Frontend", order: 2 },
  { name: "TanStack Query", category: "Frontend", order: 3 },
  { name: "Zustand", category: "Frontend", order: 4 },

  // Languages
  { name: "TypeScript", category: "Languages", order: 0, icon: "typescript" },
  { name: "Python", category: "Languages", order: 1, icon: "python" },
  { name: "SQL", category: "Languages", order: 2 },
  { name: "Bash", category: "Languages", order: 3 },

  // LLM APIs — the daily drivers
  { name: "OpenAI API", category: "LLM APIs", order: 0, icon: "openai" },
  { name: "Anthropic Claude", category: "LLM APIs", order: 1, icon: "anthropic" },
  { name: "Google Gemini", category: "LLM APIs", order: 2, icon: "googlegemini" },
  { name: "Ollama", category: "LLM APIs", order: 3, icon: "ollama" },
  { name: "LangChain", category: "LLM APIs", order: 4, icon: "langchain" },

  // Workflow — Git & Docker keep it honest
  { name: "Git", category: "Workflow", order: 0, icon: "git" },
  { name: "Docker", category: "Workflow", order: 1, icon: "docker" },
  { name: "Vercel", category: "Workflow", order: 2, icon: "vercel" },
  { name: "GitHub Actions", category: "Workflow", order: 3, icon: "githubactions" },
  { name: "Linux", category: "Workflow", order: 4, icon: "linux" },
];

/** Career timeline = school projects for now (student first, freelancer on the side). */
export const SEED_EXPERIENCES: {
  company: string;
  role: string;
  period: string;
  description: string;
  tech: string;
  current: boolean;
  order: number;
}[] = [
  {
    company: "Capstone Project",
    role: "LLM Engineer",
    period: "2026 — Present",
    description:
      "Building an AI study companion for my capstone — lecture notes in, structured flashcards, quizzes and a tutor-style chat out. I own the whole pipeline: chunking, embeddings, retrieval and fail-safe structured output.",
    tech: "Next.js, TypeScript, OpenAI API, pgvector, Docker",
    current: true,
    order: 0,
  },
  {
    company: "School Project",
    role: "Full-Stack Developer",
    period: "2025 — 2026",
    description:
      "Campus events hub for the school fair — announcements, RSVPs and QR check-in used by 500+ students. The first LLM-assisted codebase of mine that met real users at scale, deadlines and zero-tolerance-for-bugs territory.",
    tech: "Next.js, Prisma, SQLite, Tailwind CSS, GitHub Actions",
    current: false,
    order: 1,
  },
  {
    company: "School Project",
    role: "Chatbot Developer",
    period: "2024 — 2025",
    description:
      "Course-inquiry chatbot for my department: a prompt-engineered FAQ agent with function calling that answers schedules, prerequisites and room assignments — no more lining up at the registrar for one question.",
    tech: "Python, FastAPI, OpenAI API, LangChain",
    current: false,
    order: 2,
  },
  {
    company: "Personal Project",
    role: "Self-Taught Builder",
    period: "2024",
    description:
      "Where it started — Discord bots, browser userscripts and an unhealthy number of to-do apps. Learned Git properly after losing a week of work exactly once. It never happened again.",
    tech: "JavaScript, Node.js, Git, Discord.js",
    current: false,
    order: 3,
  },
];

/**
 * Real repositories (github.com/S1NXIAN). The nightly sync keeps name,
 * language, topics, stars & forks fresh; hand-written descriptions are kept
 * when GitHub has none (see src/lib/repos-sync.ts).
 */
export const SEED_REPOS: {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  featured: boolean;
}[] = [
  {
    name: "LCKED",
    description:
      "A local-first, self-hosted password manager inspired by \"Proton Pass\" — encrypted vault, zero-knowledge by design.",
    url: "https://github.com/S1NXIAN/LCKED",
    language: "TypeScript",
    stars: 0,
    forks: 0,
    featured: true,
  },
  {
    name: "omniroute-mcp-lite",
    description:
      "Thin zero-dependency stdio MCP proxy exposing only OmniRoute's web_search + web_fetch tools.",
    url: "https://github.com/S1NXIAN/omniroute-mcp-lite",
    language: "JavaScript",
    stars: 0,
    forks: 0,
    featured: true,
  },
  {
    name: "nvim",
    description:
      "My Neovim configuration — keyboard-driven, fast, and obsessively tuned down to the millisecond.",
    url: "https://github.com/S1NXIAN/nvim",
    language: "Lua",
    stars: 0,
    forks: 0,
    featured: true,
  },
  {
    name: "mastery",
    description: "Curated learning paths to programming language mastery.",
    url: "https://github.com/S1NXIAN/mastery",
    language: "",
    stars: 2,
    forks: 0,
    featured: true,
  },
  {
    name: "mv3",
    description: "",
    url: "https://github.com/S1NXIAN/mv3",
    language: "JavaScript",
    stars: 2,
    forks: 0,
    featured: false,
  },
  {
    name: "omarchy-theme-cendre",
    description: "A muted \"Cendre\" theme for Omarchy (Arch + Hyprland).",
    url: "https://github.com/S1NXIAN/omarchy-theme-cendre",
    language: "CSS",
    stars: 0,
    forks: 0,
    featured: false,
  },
  {
    name: "portfolio",
    description: "Redirect to digital portfolio on Render",
    url: "https://github.com/S1NXIAN/portfolio",
    language: "HTML",
    stars: 0,
    forks: 0,
    featured: false,
  },
  {
    name: "S1NXIAN",
    description: "My GitHub profile README",
    url: "https://github.com/S1NXIAN/S1NXIAN",
    language: "",
    stars: 0,
    forks: 0,
    featured: false,
  },
  {
    name: "S1NXIAN.github.io",
    description: "GitHub Pages site",
    url: "https://github.com/S1NXIAN/S1NXIAN.github.io",
    language: "HTML",
    stars: 0,
    forks: 0,
    featured: false,
  },
  {
    name: "ytm-scrobbler",
    description: "",
    url: "https://github.com/S1NXIAN/ytm-scrobbler",
    language: "JavaScript",
    stars: 0,
    forks: 0,
    featured: false,
  },
];

export const SEED_KNOWLEDGE: {
  title: string;
  description: string;
  category: string;
  icon: string;
  order: number;
}[] = [
  {
    title: "Context Engineering",
    description:
      "The context window is the scarcest resource in any LLM app. Trimming, structuring and staging information so the model gets exactly what it needs — nothing more, nothing less.",
    category: "LLM Craft",
    icon: "Brain",
    order: 0,
  },
  {
    title: "Prompt Architecture",
    description:
      "Prompts are APIs: versioned, tested and regression-checked. System design for instructions, few-shot selection, tool schemas and failure modes.",
    category: "LLM Craft",
    icon: "Sparkles",
    order: 1,
  },
  {
    title: "Retrieval & RAG",
    description:
      "Chunking strategies, embedding choices, hybrid search and re-ranking. Most \"AI apps\" are really retrieval apps wearing a chatbot costume.",
    category: "LLM Craft",
    icon: "Database",
    order: 2,
  },
  {
    title: "Micro-Optimization",
    description:
      "Bundle budgets, memoization, frame budgets, paint costs. The 1px and 1ms details nobody notices individually but everybody feels together.",
    category: "Detail Obsession",
    icon: "Gauge",
    order: 3,
  },
  {
    title: "Interaction Design",
    description:
      "Motion with intent: easing curves, stagger, optimistic UI. Every hover, drag and transition should tell the user something useful.",
    category: "Detail Obsession",
    icon: "Layers",
    order: 4,
  },
  {
    title: "Reproducible Workflow",
    description:
      "Docker for identical environments, Git for honest history. The boring discipline that keeps AI-speed development from turning into chaos.",
    category: "Ops",
    icon: "GitBranch",
    order: 5,
  },
];

/* ------------------------------------------------------------------ */
/*  Seeding                                                            */
/* ------------------------------------------------------------------ */

// Deterministic PRNG so seeded heatmap looks organic but stable
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function seedDatabase(db: PrismaClient) {
  // ---- Profile ----
  await db.profile.upsert({
    where: { id: "main" },
    update: {},
    create: SEED_PROFILE,
  });

  // ---- Skills ----
  const skills = SEED_SKILLS.map(({ name, category, order, icon }) => ({
    name,
    category,
    order,
    icon: icon ?? "",
  }));
  await db.skill.deleteMany();
  await db.skill.createMany({ data: skills });

  // ---- Experience ----
  const experiences = SEED_EXPERIENCES;
  await db.experience.deleteMany();
  await db.experience.createMany({ data: experiences });

  // ---- Repos ----
  const repos = SEED_REPOS.map(({ featured, ...r }, i) => ({ ...r, featured, order: i }));
  await db.repo.deleteMany();
  await db.repo.createMany({ data: repos });

  // ---- Knowledge ----
  const knowledge = SEED_KNOWLEDGE;
  await db.knowledgeItem.deleteMany();
  await db.knowledgeItem.createMany({ data: knowledge });

  // ---- Contributions (placeholder until the nightly GitHub sync lands) ----
  await db.contribution.deleteMany();
  const rand = mulberry32(42);
  const rows: { date: string; count: number; note: string }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    let p = isWeekend ? 0.28 : 0.86;
    if (rand() < 0.06) p = 0; // vacation days
    if (rand() < p) {
      let base = isWeekend ? rand() * 4 : rand() * 12 + 1;
      if (rand() < 0.1) base += rand() * 14; // hack days / releases
      const count = Math.max(1, Math.round(base));
      // ~12% of days include private commits (not visible on public GitHub)
      rows.push({ date: dateKey(d), count, note: rand() < 0.12 ? "incl. private" : "" });
    }
  }
  await db.contribution.createMany({ data: rows });

  // ---- Settings ----
  await db.setting.upsert({
    where: { key: "adminPasscode" },
    update: {},
    create: { key: "adminPasscode", value: "admin123" },
  });

  return {
    skills: skills.length,
    experiences: experiences.length,
    repos: repos.length,
    knowledge: knowledge.length,
    contributions: rows.length,
  };
}

/**
 * Boot-time self-heal: if the profile row is missing (empty/wiped DB),
 * seed the full dataset. Safe to call on every server start — it no-ops
 * when data already exists. Errors are swallowed so boot never breaks.
 */
export async function ensureSeeded(db: PrismaClient): Promise<boolean> {
  try {
    const count = await db.profile.count();
    if (count > 0) return false;
    const result = await seedDatabase(db);
    console.log(
      `[seed] empty database detected — seeded profile, skills=${result.skills}, ` +
        `experiences=${result.experiences}, repos=${result.repos}, ` +
        `knowledge=${result.knowledge}, contributions=${result.contributions}`
    );
    return true;
  } catch (err) {
    console.error("[seed] bootstrap seed failed:", err);
    return false;
  }
}
