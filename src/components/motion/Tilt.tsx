"use client";

import { useRef, useSyncExternalStore } from "react";
import type { MouseEvent, ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

type TiltProps = {
  children: ReactNode;
  className?: string;
  /** Max rotation applied at the edges of the element (degrees). */
  max?: number;
  /** Render a cursor-following glare highlight. */
  glare?: boolean;
};

const subscribeReducedMotion = (onStoreChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getReducedMotionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getReducedMotionServerSnapshot = () => false;

const subscribeCoarsePointer = (onStoreChange: () => void) => {
  const query = window.matchMedia("(pointer: coarse)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getCoarsePointerSnapshot = () => window.matchMedia("(pointer: coarse)").matches;

const getCoarsePointerServerSnapshot = () => false;

/**
 * 3D card tilt: outer wrapper provides perspective, inner motion.div rotates
 * toward the cursor with a spring and carries an optional radial glare that
 * tracks the pointer via the --gx/--gy CSS custom properties. Falls back to
 * a static wrapper on touch devices and under reduced motion.
 */
export default function Tilt({
  children,
  className,
  max = 9,
  glare = true,
}: TiltProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const coarsePointer = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot
  );
  const staticMode = reducedMotion || coarsePointer;

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 260, damping: 22 });
  const springRotateY = useSpring(rotateY, { stiffness: 260, damping: 22 });

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Cursor position normalized to [-0.5, 0.5] from the element center.
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    rotateY.set(px * max);
    rotateX.set(-py * max);

    // Glare position, exposed as percentages for the radial gradient.
    el.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  if (staticMode) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div style={{ perspective: 1100 }}>
      <motion.div
        ref={innerRef}
        className={`group relative ${className ?? ""}`}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {glare && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              borderRadius: "inherit",
              background:
                "radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), color-mix(in oklch, var(--primary) 14%, transparent), transparent 60%)",
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
