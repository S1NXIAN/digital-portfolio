"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const GLOW_SIZE = 420;
const OFFSCREEN = -9999;

const subscribeNoop = () => () => undefined;

// Mount-time capability check (per spec, no matchMedia listeners needed).
const getGlowCapabilitySnapshot = () =>
  !window.matchMedia("(pointer: coarse)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  window.innerWidth >= 768;

const getGlowCapabilityServerSnapshot = () => false;

/**
 * Soft spotlight that trails the cursor. Desktop-only (fine pointer,
 * >= 768px viewport), disabled under reduced motion. Purely decorative.
 */
export default function CursorGlow() {
  const [insideWindow, setInsideWindow] = useState(true);
  const enabled = useSyncExternalStore(
    subscribeNoop,
    getGlowCapabilitySnapshot,
    getGlowCapabilityServerSnapshot
  );

  const mouseX = useMotionValue(OFFSCREEN);
  const mouseY = useMotionValue(OFFSCREEN);
  const springX = useSpring(mouseX, { stiffness: 70, damping: 22, mass: 0.6 });
  const springY = useSpring(mouseY, { stiffness: 70, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;

    let firstMove = true;
    const handleMouseMove = (event: MouseEvent) => {
      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
      if (firstMove) {
        // Snap to the cursor on the first move instead of sweeping across
        // the screen from the offscreen start position.
        firstMove = false;
        springX.jump(event.clientX);
        springY.jump(event.clientY);
      }
    };
    const handleDocMouseLeave = () => setInsideWindow(false);
    const handleDocMouseEnter = () => setInsideWindow(true);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleDocMouseLeave);
    document.addEventListener("mouseenter", handleDocMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleDocMouseLeave);
      document.removeEventListener("mouseenter", handleDocMouseEnter);
    };
  }, [enabled, mouseX, mouseY, springX, springY]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
      style={{
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        x: springX,
        y: springY,
        background:
          "radial-gradient(circle, color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)",
      }}
      animate={{ opacity: insideWindow ? 1 : 0.4 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    />
  );
}
