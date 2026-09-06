"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Quote } from "lucide-react";
import type { ProfileData } from "@/types/portfolio";

export default function Motto({ profile }: { profile: ProfileData }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const watermarkY = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);
  const quoteY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const words = (profile.motto || "Ship. Learn. Repeat.").split(" ");

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-28 sm:py-36"
      aria-label="Personal motto"
    >
      {/* parallax watermark */}
      <motion.span
        style={{ y: watermarkY }}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[22vw] font-bold leading-none tracking-tighter text-foreground opacity-[0.035]"
      >
        MOTTO
      </motion.span>

      <motion.div style={{ y: quoteY }} className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.span
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary"
          aria-hidden
        >
          <Quote className="h-7 w-7" />
        </motion.span>

        <blockquote className="mt-8">
          <p className="text-3xl font-semibold leading-snug tracking-tight sm:text-4xl lg:text-[2.9rem] lg:leading-[1.25]">
            &ldquo;
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`inline-block ${/^(ship|build|create|craft)$/i.test(word) ? "text-gradient" : ""}`}
              >
                {word}
                {i < words.length - 1 ? "\u00A0" : ""}
              </motion.span>
            ))}
            &rdquo;
          </p>
          <footer className="mt-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="h-px w-8 bg-border" aria-hidden />
            <span className="font-medium text-foreground">{profile.name}</span>
            <span>— personal motto</span>
            <span className="h-px w-8 bg-border" aria-hidden />
          </footer>
        </blockquote>
      </motion.div>
    </section>
  );
}
