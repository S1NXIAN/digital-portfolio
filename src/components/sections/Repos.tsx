"use client";

import { ExternalLink, FolderGit2, GitFork, Star } from "lucide-react";
import { langColor } from "@/lib/lang-colors";
import Reveal from "@/components/motion/Reveal";
import Tilt from "@/components/motion/Tilt";
import SectionHeading from "@/components/sections/SectionHeading";
import type { RepoData } from "@/types/portfolio";

export default function Repos({ repos }: { repos: RepoData[] }) {
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

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {repos.map((repo, i) => (
            <Reveal key={repo.id} delay={(i % 2) * 0.08} className="h-full">
              <Tilt max={6} className="h-full">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${repo.name} on GitHub (opens in new tab)`}
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
                        <p className="font-mono text-[11px] text-muted-foreground">
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
          ))}
        </div>
      </div>
    </section>
  );
}
