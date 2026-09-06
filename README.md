# digital-portfolio

Personal portfolio — dynamic background, micro-interactions, smooth scroll, and an
owner-only admin console so content can be edited **without touching the codebase**.

## Stack

- **Next.js 16** (App Router, TypeScript) · **Tailwind CSS 4** · **shadcn/ui** · **Framer Motion**
- **Prisma + SQLite** · **TanStack Query** · **Lenis** smooth scroll · **next-themes** (light/dark)

## Features

- Hero (photo + rotating words), about, skills (masonry, adapts to uneven category sizes),
  knowledge, featured repos, experience, motto, GitHub activity heatmap
- **GitHub contributions sync** via GraphQL — **includes private commits** when the
  token owner matches the username. Nightly auto-sync at **12:00 AM Asia/Manila**.
- Admin console at `/#admin` — manage profile, skills, experience, repos, knowledge,
  contributions, passcode & token (all persisted in SQLite)
- Self-ping keep-alive (opt-in) so free hosting tiers don't spin the app down
- One-file **Render Blueprint** (`render.yaml`) for deploys

## Local development

```bash
bun install
bun run db:push        # create SQLite schema
bun run scripts/seed.ts
bun run dev            # http://localhost:3000
```

Default admin passcode after seeding: `admin123` — **change it in Admin → Settings.**

## Environment variables

See `.env.example`. Highlights:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file URL (`file:...`) |
| `GITHUB_TOKEN` | GitHub token with `read:user` — enables contributions sync incl. private commits |
| `SELF_PING_ENABLED` | `true` turns on the keep-alive self-pinger |
| `SELF_PING_INTERVAL_MIN` | Minutes between pings (default `10`) |
| `SELF_PING_URL` | Optional ping target; auto-detects `$RENDER_EXTERNAL_URL/api` on Render |

## Deploy (Render)

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo (or use the Deploy to Render button).
3. After the first deploy, set `GITHUB_TOKEN` in the service's Environment tab.
4. Open the site, go to `/#admin`, sign in with the seeded passcode, change it.

> Free plan uses ephemeral storage — the SQLite database resets on deploys.
> The self-pinger prevents idle spin-downs; upgrade to `starter` + a disk in
> `render.yaml` for persistence (instructions in the file's comments).
