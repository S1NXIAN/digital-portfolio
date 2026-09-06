"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useSpring } from "framer-motion";
import {
  cursorArmed,
  cursorInside,
  cursorVariant,
  cursorX,
  cursorY,
  type CursorVariant,
} from "@/lib/cursor-state";

const GLOW_SIZE = 420;

const subscribeNoop = () => () => undefined;

// Mount-time capability check (per spec, no matchMedia listeners needed).
const getGlowCapabilitySnapshot = () =>
  !window.matchMedia("(pointer: coarse)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  window.innerWidth >= 768;

const getGlowCapabilityServerSnapshot = () => false;

/**
 * Soft spotlight that trails the cursor and REACTS to what it hovers:
 * swells over interactive elements, shrinks over text fields and blooms
 * over labelled "view" targets. Desktop-only (fine pointer, >= 768px
 * viewport), disabled under reduced motion. Purely decorative.
 */
export default function CursorGlow() {
  const enabled = useSyncExternalStore(
    subscribeNoop,
    getGlowCapabilitySnapshot,
    getGlowCapabilityServerSnapshot
  );
  const [variant, setVariant] = useState<CursorVariant>(() => cursorVariant.get());
  const [inside, setInside] = useState(() => cursorInside.get());

  const glowX = useSpring(cursorX, { stiffness: 70, damping: 22, mass: 0.6 });
  const glowY = useSpring(cursorY, { stiffness: 70, damping: 22, mass: 0.6 });

  useEffect(() => {
    // Snap to the cursor on the first move instead of sweeping across
    // the screen from the offscreen start position.
    const unsubArmed = cursorArmed.on("change", (armed) => {
      if (armed) {
        glowX.jump(cursorX.get());
        glowY.jump(cursorY.get());
      }
    });
    const unsubVariant = cursorVariant.on("change", (next) => setVariant(next));
    const unsubInside = cursorInside.on("change", (next) => setInside(next));
    return () => {
      unsubArmed();
      unsubVariant();
      unsubInside();
    };
  }, [glowX, glowY]);

  if (!enabled) return null;

  const scale =
    variant === "link" ? 1.35 : variant === "view" ? 1.7 : variant === "text" ? 0.5 : 1;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
      style={{
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        x: glowX,
        y: glowY,
        background:
          "radial-gradient(circle, color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)",
      }}
      animate={{ opacity: inside ? 1 : 0.4, scale }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    />
  );
}
