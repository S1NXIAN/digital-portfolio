"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, FolderGit2, GitFork, Star, Tag } from "lucide-react";
import { langColor } from "@/lib/lang-colors";
import Reveal from "@/components/motion/Reveal";
import Tilt from "@/components/motion/Tilt";
import SectionHeading from "@/components/sections/SectionHeading";
import type { RepoData } from "@/types/portfolio";

function parseTopics(topics?: string): string[] {
  return (topics ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
}

export default function Repos({ repos }: { repos: RepoData[] }) {
  const [langFilter, setLangFilter] = useState<string>("all");

  // Repos synced from GitHub arrive unfeatured; once the owner stars at least
  // one, the section curates itself down to the featured set. With zero
  // featured rows (legacy data) everything is shown, so nothing disappears.
  const hasFeatured = useMemo(() => repos.some((r) => r.featured), [repos]);
  const curated = useMemo(
    () => (hasFeatured ? repos.filter((r) => r.featured) : repos),
    [repos, hasFeatured]
  );

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of curated) {
      const lang = repo.language?.trim();
      if (lang) counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [curated]);

  const visible = useMemo(() => {
    if (langFilter === "all") return curated;
    return curated.filter((r) => r.language?.trim() === langFilter);
  }, [curated, langFilter]);

  if (repos.length === 0) {
    return null;
  }

  return (
    <section id="repos" className="relative py-24 sm:py-28" aria-label="Featured repositories">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="04 — open source"
          title="Chosen repositories"
          description="Projects I'm proud to put my name on — clone, star, or break them."
        />

        {languages.length > 1 ? (
          <Reveal delay={0.05}>
            <div className="mt-10 flex flex-wrap items-center gap-2" role="group" aria-label="Filter repositories by language">
              <FilterChip
                label="All"
                count={curated.length}
                active={langFilter === "all"}
                onClick={() => setLangFilter("all")}
              />
              {languages.map(([lang, count]) => (
                <FilterChip
                  key={lang}
                  label={lang}
                  count={count}
                  dotColor={langColor(lang)}
                  active={langFilter === lang}
                  onClick={() => setLangFilter(lang)}
                />
              ))}
            </div>
          </Reveal>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((repo, i) => (
              <motion.div
                key={repo.id}
                layout
                className="min-w-0"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Reveal delay={(i % 2) * 0.08} className="h-full">
                  <Tilt max={6} className="h-full">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${repo.name} on GitHub (opens in new tab)`}
                      data-cursor="view"
                      data-cursor-label="Open"
                      className="sheen group block h-full rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-colors duration-300 hover:border-primary/45 hover:shadow-xl hover:shadow-primary/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                            <FolderGit2 className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate font-mono text-base font-semibold tracking-tight group-hover:text-primary">
                              {repo.name}
                            </h3>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {repo.url.replace(/^https?:\/\/(www\.)?/, "")}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {repo.featured ? (
                            <Star
                              className="h-4 w-4 fill-primary text-primary"
                              aria-label="Featured repository"
                            />
                          ) : null}
                          <ExternalLink
                            className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:text-primary"
                            aria-hidden
                          />
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-2 min-h-[2.6rem] text-sm leading-relaxed text-muted-foreground">
                        {repo.description}
                      </p>

                      {parseTopics(repo.topics).length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Topics">
                          {parseTopics(repo.topics).map((topic) => (
                            <li
                              key={topic}
                              className="inline-flex max-w-full items-center gap-1 break-all rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors group-hover:border-primary/25"
                            >
                              <Tag className="h-2.5 w-2.5" aria-hidden />
                              {topic}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        {repo.language ? (
                          <span className="flex items-center gap-1.5 font-medium">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: langColor(repo.language) }}
                              aria-hidden
                            />
                            {repo.language}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <Star className="h-3.5 w-3.5" aria-hidden />
                          {repo.stars.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <GitFork className="h-3.5 w-3.5" aria-hidden />
                          {repo.forks.toLocaleString()}
                        </span>
                      </div>
                    </a>
                  </Tilt>
                </Reveal>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  label,
  count,
  dotColor,
  active,
  onClick,
}: {
  label: string;
  count: number;
  dotColor?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/35 hover:text-foreground"
      }`}
    >
      {dotColor ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 max-w-[12rem] truncate">{label}</span>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
