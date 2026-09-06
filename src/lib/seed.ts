/**
 * Shared seed logic — populates the portfolio database.
 *
 * Used in two places:
 *  1. `bun run db:seed` (scripts/seed.ts) — force reseed
 *  2. Boot-time auto-heal (instrumentation.ts → ensureSeeded) — seeds only
 *     when the DB is empty, so a wiped/missing database never breaks the site.
 */
import type { PrismaClient } from "@prisma/client";

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
    create: {
      id: "main",
      name: "Alex Carter",
      headline: "Full-Stack Engineer",
      bio: "I design and build end-to-end products — from pixel-perfect interfaces to resilient backend systems. I care deeply about developer experience, performance budgets, and shipping software that feels effortless. Currently focused on TypeScript, Next.js and cloud-native architecture.",
      motto: "Build things that outlive the hype cycle.",
      photoUrl: "/avatar.png",
      location: "Manila, PH",
      email: "hello@alexcarter.dev",
      resumeUrl: "",
      yearsExperience: 6,
      availability: "Open to work",
      githubUsername: "alexcarter",
      socials: [
        { label: "GitHub", url: "https://github.com/alexcarter", icon: "Github" },
        { label: "LinkedIn", url: "https://linkedin.com/in/alexcarter", icon: "Linkedin" },
        { label: "Twitter / X", url: "https://x.com/alexcarter", icon: "Twitter" },
        { label: "Email", url: "mailto:hello@alexcarter.dev", icon: "Mail" },
      ],
      rotatingWords: [
        "Full-Stack Engineer",
        "Product Minded Builder",
        "TypeScript Enthusiast",
        "Systems Thinker",
      ],
    },
  });

  // ---- Skills ----
  // `icon` semantics: "" = auto-match from the name via dashboardicons.com / simpleicons.org,
  // "https://…" = custom image URL, "slug" = dashboardicons.com slug. See src/lib/stack-icons.ts.
  const skills = [
    { name: "TypeScript", category: "Languages", level: 95, order: 0 },
    { name: "JavaScript (ES2024)", category: "Languages", level: 95, order: 1 },
    { name: "Python", category: "Languages", level: 78, order: 2 },
    { name: "Go", category: "Languages", level: 65, order: 3 },
    { name: "SQL", category: "Languages", level: 85, order: 4 },

    { name: "React", category: "Frontend", level: 95, order: 0 },
    { name: "Next.js", category: "Frontend", level: 92, order: 1 },
    { name: "Tailwind CSS", category: "Frontend", level: 90, order: 2 },
    { name: "Framer Motion", category: "Frontend", level: 85, order: 3 },
    { name: "React Native", category: "Frontend", level: 70, order: 4 },

    { name: "Node.js", category: "Backend", level: 92, order: 0 },
    { name: "PostgreSQL", category: "Backend", level: 85, order: 1 },
    { name: "Prisma ORM", category: "Backend", level: 88, order: 2 },
    { name: "Redis", category: "Backend", level: 75, order: 3 },
    { name: "GraphQL", category: "Backend", level: 80, order: 4 },

    { name: "Docker", category: "DevOps & Cloud", level: 85, order: 0 },
    { name: "AWS", category: "DevOps & Cloud", level: 78, order: 1 },
    { name: "CI/CD (GitHub Actions)", category: "DevOps & Cloud", level: 85, order: 2 },
    { name: "Kubernetes", category: "DevOps & Cloud", level: 65, order: 3 },
    { name: "Terraform", category: "DevOps & Cloud", level: 60, order: 4 },
  ];
  await db.skill.deleteMany();
  await db.skill.createMany({ data: skills });

  // ---- Experience ----
  const experiences = [
    {
      company: "Nimbus Labs",
      role: "Senior Full-Stack Engineer",
      period: "2022 — Present",
      description:
        "Leading the platform team building a multi-tenant analytics product. Architected the move to edge-rendered Next.js, cut p95 page load by 58%, and mentor a squad of four engineers.",
      tech: "Next.js, TypeScript, PostgreSQL, AWS, Terraform",
      current: true,
      order: 0,
    },
    {
      company: "Forge Digital",
      role: "Full-Stack Developer",
      period: "2020 — 2022",
      description:
        "Shipped 12+ client products from zero to production — e-commerce, fintech dashboards and real-time collaboration tools. Introduced typed API contracts and testing culture across the team.",
      tech: "React, Node.js, GraphQL, Redis, Docker",
      current: false,
      order: 1,
    },
    {
      company: "Brightline Studio",
      role: "Frontend Developer",
      period: "2019 — 2020",
      description:
        "Built award-winning marketing sites and design systems with obsessive attention to motion and accessibility. Learned that details are the product.",
      tech: "React, Vue, GSAP, Storybook",
      current: false,
      order: 2,
    },
  ];
  await db.experience.deleteMany();
  await db.experience.createMany({ data: experiences });

  // ---- Repos ----
  const repos = [
    {
      name: "edgekit",
      description:
        "Batteries-included Next.js starter with auth, billing, typed API layer and edge caching. 4k+ downloads/month.",
      url: "https://github.com/alexcarter/edgekit",
      language: "TypeScript",
      stars: 1240,
      forks: 96,
      featured: true,
      order: 0,
    },
    {
      name: "redisqlite",
      description:
        "Tiny embedded queue with Redis semantics on top of SQLite — perfect for serverless cron workers.",
      url: "https://github.com/alexcarter/redisqlite",
      language: "Go",
      stars: 640,
      forks: 31,
      featured: true,
      order: 1,
    },
    {
      name: "motion-primitives",
      description:
        "Copy-paste Framer Motion interaction primitives: magnetic buttons, tilt cards, reveal text.",
      url: "https://github.com/alexcarter/motion-primitives",
      language: "TypeScript",
      stars: 890,
      forks: 54,
      featured: true,
      order: 2,
    },
    {
      name: "shipcheck",
      description:
        "Pre-deploy checklist CLI that audits lighthouse scores, bundle budgets and a11y before you ship.",
      url: "https://github.com/alexcarter/shipcheck",
      language: "Python",
      stars: 410,
      forks: 22,
      featured: true,
      order: 3,
    },
  ];
  await db.repo.deleteMany();
  await db.repo.createMany({ data: repos });

  // ---- Knowledge ----
  const knowledge = [
    {
      title: "System Design",
      description:
        "Scaling read-heavy services, caching strategies, event-driven pipelines, idempotent APIs and graceful degradation.",
      category: "Architecture",
      icon: "Network",
      order: 0,
    },
    {
      title: "Performance Engineering",
      description:
        "Core Web Vitals, streaming SSR, bundle budgets, query planning and profiling before guessing.",
      category: "Architecture",
      icon: "Gauge",
      order: 1,
    },
    {
      title: "Testing Culture",
      description:
        "Vitest/Playwright pyramids, contract testing, flake elimination and CI gates that people actually trust.",
      category: "Craft",
      icon: "FlaskConical",
      order: 2,
    },
    {
      title: "Type-Safe APIs",
      description:
        "End-to-end contracts with tRPC/OpenAPI, runtime validation with Zod, and zero `any` policies.",
      category: "Craft",
      icon: "ShieldCheck",
      order: 3,
    },
    {
      title: "Cloud & Infrastructure",
      description:
        "Docker-first workflows, IaC with Terraform, observability with OpenTelemetry and cost-aware autoscaling.",
      category: "Operations",
      icon: "CloudCog",
      order: 4,
    },
    {
      title: "Developer Experience",
      description:
        "Monorepo tooling, fast local loops, AI-assisted workflows and docs that make onboarding a day, not a month.",
      category: "Operations",
      icon: "Terminal",
      order: 5,
    },
  ];
  await db.knowledgeItem.deleteMany();
  await db.knowledgeItem.createMany({ data: knowledge });

  // ---- Contributions (last 365 days, realistic pattern) ----
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
