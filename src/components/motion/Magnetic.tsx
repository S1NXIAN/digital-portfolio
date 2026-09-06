"use client";

import { useRef, useSyncExternalStore } from "react";
import type { MouseEvent, ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

type MagneticProps = {
  children: ReactNode;
  /** How strongly the element is pulled toward the cursor (0–1). */
  strength?: number;
  className?: string;
};

const subscribeCoarsePointer = (onStoreChange: () => void) => {
  const query = window.matchMedia("(pointer: coarse)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getCoarsePointerSnapshot = () => window.matchMedia("(pointer: coarse)").matches;

const getCoarsePointerServerSnapshot = () => false;

/**
 * Magnetic hover wrapper: the wrapped content is gently attracted to the
 * cursor while hovered and springs back on leave. Falls back to a plain
 * wrapper on touch (pointer: coarse) devices.
 */
export default function Magnetic({
  children,
  strength = 0.35,
  className,
}: MagneticProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const touchMode = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 14 });
  const springY = useSpring(y, { stiffness: 180, damping: 14 });

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    x.set(offsetX * strength);
    y.set(offsetY * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (touchMode) {
    return <div className={className ?? "inline-block"}>{children}</div>;
  }

  return (
    <motion.div
      ref={wrapRef}
      className={className ?? "inline-block"}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}
