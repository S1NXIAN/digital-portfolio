"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Briefcase } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import SectionHeading from "@/components/sections/SectionHeading";
import { Badge } from "@/components/ui/badge";
import type { ExperienceData } from "@/types/portfolio";

export default function Experience({ experiences }: { experiences: ExperienceData[] }) {
  const lineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ["start 75%", "end 55%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  return (
    <section id="experience" className="relative py-24 sm:py-28" aria-label="Work experience">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="03 — experience"
          title="Where I've been"
          description="Roles that shaped how I design, build and ship software."
        />

        <div ref={lineRef} className="relative mt-14 pl-8 sm:pl-12">
          {/* rail */}
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" aria-hidden />
          <motion.div
            className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-primary"
            style={{ scaleY: progress }}
            aria-hidden
          />

          <ol className="space-y-10">
            {experiences.map((exp, i) => (
              <li key={exp.id} className="relative">
                <span
                  className={`absolute -left-8 top-2 flex h-[15px] w-[15px] -translate-x-[4px] items-center justify-center sm:-left-12 ${
                    exp.current ? "animate-pulse-ring" : ""
                  }`}
                  aria-hidden
                >
                  <span
                    className={`h-[11px] w-[11px] rounded-full border-2 ${
                      exp.current
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    }`}
                  />
                </span>

                <Reveal delay={i * 0.06}>
                  <article className="group rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/[0.05] sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                          {exp.role}
                          <span className="text-primary"> · {exp.company}</span>
                        </h3>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{exp.period}</p>
                      </div>
                      {exp.current ? (
                        <Badge className="gap-1.5 rounded-full bg-primary/15 text-primary hover:bg-primary/15">
                          <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full">
                          <Briefcase className="mr-1 h-3 w-3" aria-hidden />
                          Past
                        </Badge>
                      )}
                    </div>

                    <p className="mt-4 leading-relaxed text-muted-foreground">{exp.description}</p>

                    {exp.tech ? (
                      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies used">
                        {exp.tech
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((tech) => (
                            <li
                              key={tech}
                              className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors group-hover:border-primary/25"
                            >
                              {tech}
                            </li>
                          ))}
                      </ul>
                    ) : null}
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
