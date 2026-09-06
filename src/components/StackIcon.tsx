"use client";

import { useEffect, useMemo, useState } from "react";
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
 */
export default function StackIcon({ name, icon, className, title }: StackIconProps) {
  const candidates = useMemo(
    () => resolveStackIconCandidates(name, icon),
    [name, icon]
  );
  const [tried, setTried] = useState(0);

  // Reset the walk when the candidate list changes (skill edited/renamed).
  useEffect(() => setTried(0), [candidates]);

  const src = candidates[tried];

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
      onError={() => setTried((t) => t + 1)}
      className={`object-contain ${className ?? ""}`}
    />
  );
}
