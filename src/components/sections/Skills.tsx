"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/motion/Reveal";
import SectionHeading from "@/components/sections/SectionHeading";
import StackIcon from "@/components/StackIcon";
import type { SkillData } from "@/types/portfolio";

export default function Skills({ skills }: { skills: SkillData[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const map = new Map<string, SkillData[]>();
    for (const skill of skills) {
      const list = map.get(skill.category) ?? [];
      list.push(skill);
      map.set(skill.category, list);
    }
    // Categories render alphabetically (API pre-sorts by category) — keep the
    // items inside each category alphabetical too, so the card reads like a
    // sorted index rather than an admin-order artifact.
    for (const list of map.values()) {
      list.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
      );
    }
    return Array.from(map.entries());
  }, [skills]);

  const visible = useMemo(
    () => (activeCategory === "all" ? categories : categories.filter(([c]) => c === activeCategory)),
    [categories, activeCategory]
  );

  if (skills.length === 0) return null;

  return (
    <section id="skills" className="relative py-24 sm:py-28" aria-label="Skills">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="02 — stack"
          title="Tools of the trade"
          description="The languages, frameworks and tooling that show up in my shipped work."
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
          </div>
        </Reveal>

        {/*
          Masonry layout (CSS multi-column): every card keeps its natural height
          and the browser balances the columns, so heavily imbalanced categories
          (e.g. 18 languages vs 5 frontend) never stretch or leave dead space.
        */}
        <div className="mt-8 columns-1 gap-5 md:columns-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map(([category, items]) => (
              <motion.div
                key={category}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="mb-5 break-inside-avoid"
              >
                <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-colors duration-300 hover:border-primary/30">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="break-all font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      {category}
                    </h3>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                      {items.length} skills
                    </span>
                  </div>
                  {/* Chip cloud — the stack speaks for itself; no invented metrics. */}
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <li
                        key={skill.id}
                        className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-2.5 py-1.5 text-sm transition-colors duration-200 hover:border-primary/40"
                      >
                        <StackIcon
                          name={skill.name}
                          icon={skill.icon}
                          className="size-4 shrink-0"
                        />
                        <span className="min-w-0 break-all">{skill.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
      className={`inline-flex min-w-0 max-w-full items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/35 hover:text-foreground"
      }`}
    >
      <span className="min-w-0 max-w-[12rem] truncate">{label}</span>
      <span
        className={`ml-1.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
