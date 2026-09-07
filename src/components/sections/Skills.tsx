"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppWindow,
  Boxes,
  Braces,
  Brain,
  Code2,
  Database,
  Palette,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import SectionHeading from "@/components/sections/SectionHeading";
import StackIcon from "@/components/StackIcon";
import type { SkillData } from "@/types/portfolio";

/**
 * Categories are free-form admin data, so tile icons come from a keyword
 * match with a neutral fallback — any custom category still gets a coherent
 * mark instead of a bare text header.
 */
const CATEGORY_ICON_RULES: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  [/api|backend|server|integrat/i, Braces],
  [/design|motion|art|brand/i, Palette],
  [/front|web|client|ui\b/i, AppWindow],
  [/lang/i, Code2],
  [/workflow|ops|devops|cloud|git/i, Workflow],
  [/data|db\b|sql/i, Database],
  [/ai|llm|prompt|rag|model/i, Brain],
];

function categoryIcon(category: string): LucideIcon {
  for (const [pattern, icon] of CATEGORY_ICON_RULES) {
    if (pattern.test(category)) return icon;
  }
  return Boxes;
}

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
        <Reveal delay={0.1}>
          <div className="mt-8 columns-1 gap-5 md:columns-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map(([category, items]) => {
                const Icon = categoryIcon(category);
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
                    <div className="sheen group/card relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/[0.07]">
                      {/* glow wash — fades in with the card's hover state */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover/card:opacity-100"
                      />
                      <div className="relative p-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover/card:rotate-3 group-hover/card:scale-105">
                            <Icon className="size-4.5" aria-hidden />
                          </span>
                          <h3 className="min-w-0 break-all font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            {category}
                          </h3>
                          <span className="ml-auto shrink-0 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {items.length} skills
                          </span>
                        </div>
                        <div
                          aria-hidden
                          className="mt-4 h-px bg-gradient-to-r from-border/80 via-border/40 to-transparent"
                        />
                        {/* Chip cloud — the stack speaks for itself; no invented metrics. */}
                        <ul className="mt-4 flex flex-wrap gap-2">
                          {items.map((skill) => (
                            <li
                              key={skill.id}
                              className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-2.5 py-1.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.06]"
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
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Reveal>
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
