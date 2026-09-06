# Project Setup Guide

Step-by-step guide to clone, configure, and run this personal portfolio with Supabase PostgreSQL and Next.js.

---

## 1. Prerequisites

- **Runtime:** [Bun](https://bun.sh/) (v1.1+) or Node.js (v18.18+ / v20+)
- **Database:** A [Supabase](https://supabase.com/) account (Free tier is sufficient)
- **Git:** Git installed locally
- **GitHub Token (Optional):** Personal Access Token (`read:user` scope) to sync GitHub heatmap and private commits

---

## 2. Clone and Install

```bash
git clone https://github.com/S1NXIAN/digital-portfolio.git
cd digital-portfolio
bun install
```

*(If using npm: `npm install`)*

---

## 3. Supabase Database Configuration

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project** and select your organization.
   - **Name:** `digital-portfolio` (or your choice)
   - **Database Password:** Set a secure password and save it
   - **Region:** Choose the region closest to your deployment server
3. Navigate to **Project Settings** → **Database** → **Connection String**:
   - **Transaction Pooler (Port 6543):**
     Select **Transaction** mode. Copy the URI. Append `&sslmode=require` if not present.
     Example:
     `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`
   - **Session Pooler / Direct Connection (Port 5432):**
     Select **Session** mode (or direct connection). Copy the URI.
     Example:
     `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require`

---

## 4. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# --- Database (Supabase PostgreSQL) ---
# Pooled connection string (used by app at runtime)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Direct connection string (used by Prisma CLI for migrations)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require"

# --- GitHub Contributions Sync (Optional) ---
# Create at https://github.com/settings/tokens (scope: read:user)
GITHUB_TOKEN=

# --- Free Tier Keep-Alive Ping (Optional) ---
SELF_PING_ENABLED=false
SELF_PING_INTERVAL_MIN=10
```

---

## 5. Initialize Database Schema & Seed Data

Push the Prisma schema to your Supabase PostgreSQL database and populate initial sample data:

```bash
# 1. Generate Prisma Client
bun run db:generate

# 2. Push database tables to Supabase
bun run db:push

# 3. Seed initial content (Profile, Skills, Experience, Projects)
bun run db:seed
```

---

## 6. Secure Supabase (Row Level Security)

By default, Supabase exposes public tables through its PostgREST API using the anon key. Because this application connects exclusively via server-side Prisma, lock down PostgREST by enabling Row Level Security (RLS) on all tables.

Run this in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

```sql
ALTER TABLE public.Profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Repo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.KnowledgeItem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Contribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Setting ENABLE ROW LEVEL SECURITY;
```

*(Prisma continues to operate normally with its direct database user).*

---

## 7. Run Locally

Start the Next.js development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Admin Panel:** Navigate to [http://localhost:3000/#admin](http://localhost:3000/#admin) or click the **Admin** link in the footer.
- **Default Admin Passcode:** `admin123` (Change this in the Admin Settings tab).

---

## 8. Deployment

### Render (Recommended)

This repository includes a `render.yaml` Blueprint spec:

1. Push your repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Select your repository.
4. Set the following environment variables in the Render dashboard:
   - `DATABASE_URL`: Your Supabase pooled connection string
   - `DIRECT_URL`: Your Supabase direct connection string
   - `GITHUB_TOKEN`: (Optional) Your GitHub token for commit sync
5. Click **Apply**. Render will automatically build and deploy the standalone server.

### Vercel

1. Import the repository in the Vercel Dashboard.
2. Set `DATABASE_URL` and `DIRECT_URL` under **Project Settings** → **Environment Variables**.
3. Build Command: `prisma generate && prisma db push && next build`
4. Deploy.

---

## 9. Useful Commands

| Command | Description |
|---|---|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Build standalone production bundle |
| `bun run start` | Run production standalone server |
| `bun run db:generate` | Regenerate Prisma Client |
| `bun run db:push` | Sync Prisma schema with database |
| `bun run db:seed` | Seed database with default portfolio data |
| `bun run lint` | Run ESLint across codebase |
| `bun run ping` | Start curl self-ping loop every 14 minutes |
