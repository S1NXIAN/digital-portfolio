"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/motion/Reveal";
import SectionHeading from "@/components/sections/SectionHeading";
import StackIcon from "@/components/StackIcon";
import type { SkillData } from "@/types/portfolio";

/** Categories with more than this many skills render in a denser 2-column grid. */
const COMPACT_THRESHOLD = 8;

export default function Skills({ skills }: { skills: SkillData[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const map = new Map<string, SkillData[]>();
    for (const skill of skills) {
      const list = map.get(skill.category) ?? [];
      list.push(skill);
      map.set(skill.category, list);
    }
    // stable order: by first appearance (data is pre-sorted by category, order)
    return Array.from(map.entries());
  }, [skills]);

  const visible = useMemo(
    () => (activeCategory === "all" ? categories : categories.filter(([c]) => c === activeCategory)),
    [categories, activeCategory]
  );

  const summary = useMemo(() => {
    const pool =
      activeCategory === "all"
        ? skills
        : categories.find(([c]) => c === activeCategory)?.[1] ?? [];
    const avg = pool.length
      ? Math.round(pool.reduce((sum, s) => sum + s.level, 0) / pool.length)
      : 0;
    return { count: pool.length, avg };
  }, [skills, categories, activeCategory]);

  if (skills.length === 0) return null;

  return (
    <section id="skills" className="relative py-24 sm:py-28" aria-label="Skills">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="02 — stack"
          title="Tools of the trade"
          description="Depth where it matters, breadth where it helps — proficiency is honest, not aspirational."
        />

        {/* Category filter chips */}
        <Reveal delay={0.05}>
          <div className="mt-10 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter skills by category">
            <FilterChip
              label="All"
              count={skills.length}
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            {categories.map(([category, items]) => (
              <FilterChip
                key={category}
                label={category}
                count={items.length}
                active={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              />
            ))}
            <span className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="font-mono tabular-nums">{summary.count} skills</span>
              <span aria-hidden>·</span>
              <span className="font-mono tabular-nums">avg {summary.avg}%</span>
            </span>
          </div>
        </Reveal>

        {/*
          Masonry layout (CSS multi-column): every card keeps its natural height
          and the browser balances the columns, so heavily imbalanced categories
          (e.g. 18 languages vs 5 frontend) never stretch or leave dead space.
        */}
        <div className="mt-8 columns-1 gap-5 md:columns-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map(([category, items], gi) => {
              const compact = items.length > COMPACT_THRESHOLD;
              return (
                <motion.div
                  key={category}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-5 break-inside-avoid"
                >
                  <div className="@container rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-colors duration-300 hover:border-primary/30">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        {category}
                      </h3>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        {items.length} skills
                      </span>
                    </div>
                    <ul
                      className={
                        compact
                          ? "mt-4 grid grid-cols-1 gap-x-8 gap-y-4 @md:grid-cols-2"
                          : "mt-5 space-y-4"
                      }
                    >
                      {items.map((skill, i) => (
                        <li key={skill.id}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <StackIcon
                                name={skill.name}
                                icon={skill.icon}
                                className="size-4 shrink-0"
                              />
                              {skill.name}
                            </span>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                              {skill.level}%
                            </span>
                          </div>
                          <div
                            className={`mt-1.5 overflow-hidden rounded-full bg-muted ${
                              compact ? "h-1" : "h-1.5"
                            }`}
                          >
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                              initial={{ width: 0 }}
                              whileInView={{ width: `${skill.level}%` }}
                              viewport={{ once: true, margin: "-40px" }}
                              transition={{
                                duration: 1.1,
                                delay: Math.min(0.15 + i * 0.07, 0.9),
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/35 hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
