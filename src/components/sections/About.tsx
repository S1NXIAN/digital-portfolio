"use client";

import {
  BookOpen,
  Brain,
  Code2,
  CloudCog,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import Tilt from "@/components/motion/Tilt";
import SectionHeading from "@/components/sections/SectionHeading";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeData, ProfileData } from "@/types/portfolio";

const KNOWLEDGE_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Brain,
  Code2,
  CloudCog,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  Network,
  Rocket,
  ShieldCheck,
  Terminal,
  Wrench,
  BookOpen,
};

export default function About({
  profile,
  knowledge,
}: {
  profile: ProfileData;
  knowledge: KnowledgeData[];
}) {
  return (
    <section id="about" className="relative py-24 sm:py-28" aria-label="About and knowledge">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="01 — about"
          title="What I do, and how I think"
          description="A quick snapshot of the craft behind the commits."
        />

        {/* Stats deliberately live only in the hero — this section is the
            narrative (bio + knowledge), not a second copy of the counters. */}
        {profile.bio ? (
          <Reveal delay={0.1} className="mt-12 max-w-3xl">
            <div className="space-y-4">
              {profile.bio
                .split(/\n{2,}|\r\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para, i) => (
                  <p
                    key={i}
                    className={`break-words leading-relaxed text-muted-foreground ${
                      i === 0 ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                    }`}
                  >
                    {para}
                  </p>
                ))}
            </div>
          </Reveal>
        ) : null}

        {knowledge.length > 0 ? (
          <div className="mt-16">
            <Reveal>
              <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                Areas of knowledge
              </h3>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {knowledge.map((item, i) => {
                const Icon = KNOWLEDGE_ICONS[item.icon] ?? Sparkles;
                return (
                  <Reveal key={item.id} delay={(i % 3) * 0.08}>
                    <Tilt max={7} className="h-full">
                      <article className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <Badge variant="secondary" className="max-w-full font-mono text-[10px] uppercase tracking-wider">
                            <span className="break-all">{item.category}</span>
                          </Badge>
                        </div>
                        <h4 className="mt-4 break-words font-semibold tracking-tight">{item.title}</h4>
                        <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </article>
                    </Tilt>
                  </Reveal>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
