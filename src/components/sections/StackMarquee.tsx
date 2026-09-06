"use client";

import { useMemo } from "react";
import type { SkillData } from "@/types/portfolio";
import StackIcon from "@/components/StackIcon";

export default function StackMarquee({ skills }: { skills: SkillData[] }) {
  const items = useMemo(() => {
    const seen = new Set<string>();
    const unique: SkillData[] = [];
    for (const s of skills) {
      const key = s.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(s);
    }
    return unique.slice(0, 18);
  }, [skills]);

  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <section aria-label="Technology stack ticker" className="relative py-6">
      <div
        className="marquee-paused overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
      >
        <div className="animate-marquee flex w-max items-center gap-3 pr-3">
          {doubled.map((skill, i) => (
            <span
              key={`${skill.id}-${i}`}
              className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card/50 px-4 py-2 font-mono text-sm text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
            >
              <StackIcon
                name={skill.name}
                icon={skill.icon}
                className="size-4 shrink-0"
              />
              {skill.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
