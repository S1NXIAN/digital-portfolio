"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Briefcase } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import SectionHeading from "@/components/sections/SectionHeading";
import { Badge } from "@/components/ui/badge";
import type { ExperienceData } from "@/types/portfolio";

/** The rail is inset 8px (top-2/bottom-2) inside the timeline container. */
const RAIL_INSET = 8;
/** Progress the line tip must travel past a dot before it is fully lit. */
const LIGHT_WINDOW = 0.035;

export default function Experience({ experiences }: { experiences: ExperienceData[] }) {
  const lineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ["start 75%", "end 55%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  // Measured fraction (0..1) of the rail where each dot sits. A dot lights up
  // when the tip of the progress line reaches that fraction — same spring
  // drives both the line and the dots, so they can never drift apart.
  const [fractions, setFractions] = useState<number[]>([]);

  useEffect(() => {
    const root = lineRef.current;
    if (!root) return;

    const measure = () => {
      const rail = root.getBoundingClientRect();
      const railTop = rail.top + RAIL_INSET;
      const railLen = Math.max(rail.height - RAIL_INSET * 2, 1);
      const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-timeline-dot]"));
      const next = dots.map((dot) => {
        const r = dot.getBoundingClientRect();
        return (r.top + r.height / 2 - railTop) / railLen;
      });
      setFractions((prev) =>
        prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 0.002)
          ? prev
          : next,
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [experiences.length]);

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
                <TimelineDot
                  progress={progress}
                  fraction={fractions[i] ?? Number.POSITIVE_INFINITY}
                  current={exp.current}
                />

                <Reveal delay={i * 0.06}>
                  <article className="group rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/[0.05] sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-base font-bold text-primary transition-transform duration-300 group-hover:scale-105"
                          aria-hidden
                        >
                          {exp.company.trim().charAt(0).toUpperCase() || "•"}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                            {exp.role}
                            <span className="text-primary"> · {exp.company}</span>
                          </h3>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{exp.period}</p>
                        </div>
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

                    <ExperienceDescription description={exp.description} />

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

/**
 * A timeline dot that lights up (fades to the lit style) exactly when the
 * progress line tip reaches it. Purely motion-value driven — no re-renders,
 * and it un-lights when scrolling back up.
 */
function TimelineDot({
  progress,
  fraction,
  current,
}: {
  progress: MotionValue<number>;
  fraction: number;
  current: boolean;
}) {
  // Not measured yet → park the range where the line can never reach it.
  const f = Number.isFinite(fraction) ? fraction : 2;
  const litOpacity = useTransform(progress, [f, f + LIGHT_WINDOW], [0, 1]);

  return (
    <span
      data-timeline-dot
      className="absolute -left-8 top-2 flex h-[15px] w-[15px] items-center justify-center sm:-left-12"
      aria-hidden
    >
      {/* unlit base dot */}
      <span className="h-[11px] w-[11px] rounded-full border-2 border-border bg-background" />
      {/* lit dot — appears the moment the line reaches this dot */}
      <motion.span
        style={{ opacity: litOpacity }}
        className={`absolute inset-0 flex items-center justify-center ${current ? "animate-pulse-ring" : ""}`}
      >
        <span className="h-[11px] w-[11px] rounded-full border-2 border-primary bg-primary" />
      </motion.span>
    </span>
  );
}

/**
 * Renders the description: lines that start with "-", "*" or "•" become a
 * styled bullet list; the remaining lines render as paragraphs.
 */
function ExperienceDescription({ description }: { description: string }) {
  const content = (description ?? "").replace(/\r\n/g, "\n").trim();
  if (!content) return null;

  const lines = content.split("\n");
  const bullets: string[] = [];
  const paragraphs: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^(?:[-•*]\s+)(.+)$/);
    if (bullet) bullets.push(bullet[1]);
    else paragraphs.push(line);
  }

  if (bullets.length === 0) {
    return <p className="mt-4 leading-relaxed text-muted-foreground">{content}</p>;
  }

  return (
    <div className="mt-4">
      {paragraphs.length > 0 ? (
        <div className="space-y-2">
          {paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
      ) : null}
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-muted-foreground">
            <span
              className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
              aria-hidden
            />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
