"use client";

import { useState } from "react";
import { resolveStackIcon } from "@/lib/stack-icons";

interface StackIconProps {
  name: string;
  /** "" = auto-match · "https://…" = custom URL · otherwise a dashboardicons.com slug */
  icon?: string;
  /** size + extra classes, e.g. "size-4" or "size-5" */
  className?: string;
  title?: string;
}

/**
 * Icon for a stack item: custom URL / dashboardicons slug / auto-matched from the name.
 * Falls back to a letter chip when nothing resolves or the image 404s.
 */
export default function StackIcon({ name, icon, className, title }: StackIconProps) {
  const src = resolveStackIcon(name, icon);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  if (!src || failedFor === src) {
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
      onError={() => setFailedFor(src)}
      className={`object-contain ${className ?? ""}`}
    />
  );
}
