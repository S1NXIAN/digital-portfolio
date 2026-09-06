"use client";

import Reveal from "@/components/motion/Reveal";

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export default function SectionHeading({ eyebrow, title, description, align = "left" }: Props) {
  const centered = align === "center";
  return (
    <Reveal className={centered ? "text-center" : undefined}>
      <p className="font-mono text-sm uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description ? (
        <p
          className={`mt-3 max-w-2xl text-muted-foreground ${centered ? "mx-auto" : ""}`}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
