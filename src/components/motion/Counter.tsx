"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { animate, useInView } from "framer-motion";

type CounterProps = {
  /** Target value counted up to when scrolled into view. */
  value: number;
  /** Animation duration in seconds. */
  duration?: number;
  className?: string;
  /** Rendered before the number, e.g. "$". */
  prefix?: string;
  /** Rendered after the number, e.g. "+". */
  suffix?: string;
};

const subscribeReducedMotion = (onStoreChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getReducedMotionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getReducedMotionServerSnapshot = () => false;

/**
 * Animated number that counts 0 → value when it enters the viewport.
 * Updates the number node's textContent directly (no per-frame re-renders).
 * tabular-nums keeps the width stable while digits change; under reduced
 * motion the formatted value is rendered statically.
 */
export default function Counter({
  value,
  duration = 1.6,
  className,
  prefix = "",
  suffix = "",
}: CounterProps) {
  const viewRef = useRef<HTMLSpanElement | null>(null);
  const numberRef = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(viewRef, { once: true, margin: "-40px" });
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    const el = numberRef.current;
    if (!el) return;

    if (reducedMotion) {
      el.textContent = value.toLocaleString("en-US");
      return;
    }

    if (!isInView) {
      el.textContent = "0";
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        if (numberRef.current) {
          numberRef.current.textContent = Math.round(latest).toLocaleString("en-US");
        }
      },
    });

    return () => controls.stop();
  }, [isInView, value, duration, reducedMotion]);

  return (
    <span ref={viewRef} className={`tabular-nums ${className ?? ""}`}>
      {prefix}
      <span ref={numberRef}>0</span>
      {suffix}
    </span>
  );
}
