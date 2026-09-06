"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

type RevealProps = {
  children: ReactNode;
  /** Delay (seconds) before the entrance animation starts. */
  delay?: number;
  /** Vertical offset (px) the element starts from. */
  y?: number;
  className?: string;
  /** Animate only the first time the element scrolls into view. */
  once?: boolean;
  /** Also animate a blur(8px) → blur(0px) filter. */
  blur?: boolean;
};

const subscribeReducedMotion = (onStoreChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getReducedMotionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getReducedMotionServerSnapshot = () => false;

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

/**
 * Scroll-triggered entrance wrapper. Renders a plain (non-animated) div
 * when the user prefers reduced motion.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
  blur = false,
}: RevealProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: blur ? "blur(8px)" : "none" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
