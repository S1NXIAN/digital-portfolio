"use client";

import { useMemo, useState } from "react";
import { resolveStackIconCandidates } from "@/lib/stack-icons";

interface StackIconProps {
  name: string;
  /** "" = auto-match · "https://…" = custom URL · otherwise an icon slug
   *  (simple-icons or dashboardicons — both providers are tried in order) */
  icon?: string;
  /** size + extra classes, e.g. "size-4" or "size-5" */
  className?: string;
  title?: string;
}

/**
 * Icon for a stack item: custom URL / icon slug / auto-matched from the name.
 * Walks the candidate list (curated alias → Simple Icons → Dashboard Icons)
 * and only falls back to a letter chip when every provider misses — so any
 * recognizable brand always gets its real logo.
 *
 * Failed URLs are remembered in a set rather than an index, so a change of
 * skill (new candidates) naturally restarts the walk — and a URL that 404'd
 * once is correctly skipped everywhere.
 */
export default function StackIcon({ name, icon, className, title }: StackIconProps) {
  const candidates = useMemo(
    () => resolveStackIconCandidates(name, icon),
    [name, icon]
  );
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  const src = candidates.find((c) => !failed.has(c));

  if (!src) {
    const letter = (name.trim()[0] ?? "?").toUpperCase();
    return (
      <span
        aria-hidden
        title={title}
        className={`flex select-none items-center justify-center rounded-[4px] bg-primary/10 font-mono text-[0.6em] font-bold leading-none text-primary ${className ?? ""}`}
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt=""
      aria-hidden={!title}
      title={title}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() =>
        setFailed((prev) => {
          if (prev.has(src)) return prev;
          const next = new Set(prev);
          next.add(src);
          return next;
        })
      }
      className={`object-contain ${className ?? ""}`}
    />
  );
}
