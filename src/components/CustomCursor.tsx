"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import {
  cursorArmed,
  cursorInside,
  cursorLabel,
  cursorNX,
  cursorNY,
  cursorPressed,
  cursorVariant,
  cursorX,
  cursorY,
  type CursorVariant,
} from "@/lib/cursor-state";

/* ------------------------- capability gate ------------------------- */

const subscribeCapability = (onStoreChange: () => void) => {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const notify = () => onStoreChange();
  fine.addEventListener("change", notify);
  reduced.addEventListener("change", notify);
  return () => {
    fine.removeEventListener("change", notify);
    reduced.removeEventListener("change", notify);
  };
};

const getCapabilitySnapshot = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  window.innerWidth >= 768;

const getCapabilityServerSnapshot = () => false;

/* ------------------------ hover classification ------------------------ */

const HOVERABLE_SELECTOR = [
  "[data-cursor]",
  "a",
  "button",
  '[role="button"]',
  "summary",
  "input",
  "textarea",
  "select",
  "label",
  '[contenteditable="true"]',
].join(", ");

const TEXT_FIELD_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="file"])',
  "textarea",
  '[contenteditable="true"]',
].join(", ");

type Classification = { variant: CursorVariant; label: string };

function classifyTarget(target: Element | null): Classification {
  const el = target?.closest?.(HOVERABLE_SELECTOR);
  if (!el) return { variant: "default", label: "" };

  switch (el.getAttribute("data-cursor")) {
    case "view":
      return {
        variant: "view",
        label: (el.getAttribute("data-cursor-label") || "View").slice(0, 12),
      };
    case "text":
      return { variant: "text", label: "" };
    case "link":
      return { variant: "link", label: "" };
    case "none":
      return { variant: "default", label: "" };
  }

  if (el.matches(TEXT_FIELD_SELECTOR)) return { variant: "text", label: "" };
  return { variant: "link", label: "" };
}

/* ------------------------------ springs ------------------------------ */

const DOT_SPRING = { stiffness: 1100, damping: 65, mass: 0.12 };
const RING_SPRING = { stiffness: 280, damping: 24, mass: 0.55 };

/**
 * Custom cursor: a near-instant dot wrapped by a trailing ring that morphs
 * based on the hover target —
 *   • links / buttons      → ring swells, dot tightens
 *   • text fields          → ring becomes an I-beam style caret bar
 *   • [data-cursor="view"] → ring blooms into a labelled disc (e.g. "Open")
 *   • press                → everything compresses
 * Desktop (fine pointer) only; the native cursor stays untouched on touch
 * devices and under prefers-reduced-motion.
 */
export default function CustomCursor() {
  const enabled = useSyncExternalStore(
    subscribeCapability,
    getCapabilitySnapshot,
    getCapabilityServerSnapshot
  );

  const [visible, setVisible] = useState(false);
  const [inside, setInside] = useState(true);
  const [pressed, setPressed] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>("default");
  const [label, setLabel] = useState("");

  const dotX = useSpring(cursorX, DOT_SPRING);
  const dotY = useSpring(cursorY, DOT_SPRING);
  const ringX = useSpring(cursorX, RING_SPRING);
  const ringY = useSpring(cursorY, RING_SPRING);
  const barX = useSpring(cursorX, DOT_SPRING);
  const barY = useSpring(cursorY, DOT_SPRING);
  const bubbleX = useSpring(cursorX, RING_SPRING);
  const bubbleY = useSpring(cursorY, RING_SPRING);

  // Opt out of the native cursor only while the custom one is live.
  useEffect(() => {
    if (!enabled) return;
    document.documentElement.setAttribute("data-custom-cursor", "");
    return () => document.documentElement.removeAttribute("data-custom-cursor");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const springsX = [dotX, ringX, barX, bubbleX];
    const springsY = [dotY, ringY, barY, bubbleY];

    const handleMove = (event: MouseEvent) => {
      cursorX.set(event.clientX);
      cursorY.set(event.clientY);
      cursorNX.set((event.clientX / window.innerWidth) * 2 - 1);
      cursorNY.set((event.clientY / window.innerHeight) * 2 - 1);
      if (!cursorArmed.get()) {
        // Snap every spring to the first known position — no sweep-in.
        cursorArmed.set(true);
        for (const spring of springsX) spring.jump(event.clientX);
        for (const spring of springsY) spring.jump(event.clientY);
        setVisible(true);
      }
    };

    const handleOver = (event: MouseEvent) => {
      const next = classifyTarget(event.target as Element | null);
      setVariant(next.variant);
      setLabel(next.label);
      cursorVariant.set(next.variant);
      cursorLabel.set(next.label);
    };

    const handleLeave = () => {
      setInside(false);
      cursorInside.set(false);
      setVisible(false);
    };

    const handleEnter = () => {
      setInside(true);
      cursorInside.set(true);
      if (cursorArmed.get()) setVisible(true);
    };

    const handleDown = () => {
      setPressed(true);
      cursorPressed.set(true);
    };

    const handleUp = () => {
      setPressed(false);
      cursorPressed.set(false);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseover", handleOver, true);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseover", handleOver, true);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [enabled, dotX, dotY, ringX, ringY, barX, barY, bubbleX, bubbleY]);

  if (!enabled) return null;

  const interactive = variant === "link";
  const overlay = variant === "view" || variant === "text";
  const ringScale = overlay ? 0 : pressed ? (interactive ? 1.2 : 0.75) : interactive ? 1.55 : 1;
  const dotScale = overlay ? 0 : pressed ? 0.6 : interactive ? 0.5 : 1;
  const bubbleScale = variant === "view" ? (pressed ? 0.88 : 1) : 0.3;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="custom-cursor"
          aria-hidden="true"
          data-testid="custom-cursor"
          className="pointer-events-none fixed inset-0 z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          {/* Trailing ring */}
          <motion.div className="absolute left-0 top-0" style={{ x: ringX, y: ringY }}>
            <motion.div
              className="h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/70 mix-blend-difference"
              animate={{ scale: ringScale }}
              transition={{ type: "spring", stiffness: 330, damping: 22 }}
            />
          </motion.div>

          {/* Core dot */}
          <motion.div className="absolute left-0 top-0" style={{ x: dotX, y: dotY }}>
            <motion.div
              className="h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground mix-blend-difference"
              animate={{ scale: dotScale }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
            />
          </motion.div>

          {/* Caret bar for text fields */}
          <motion.div className="absolute left-0 top-0" style={{ x: barX, y: barY }}>
            <motion.div
              className="h-[26px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground mix-blend-difference"
              initial={false}
              animate={{ scaleY: variant === "text" ? 1 : 0, opacity: variant === "text" ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            />
          </motion.div>

          {/* Labelled bubble for view targets */}
          <motion.div className="absolute left-0 top-0" style={{ x: bubbleX, y: bubbleY }}>
            <motion.div
              className="flex h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25"
              initial={false}
              animate={{ scale: bubbleScale, opacity: variant === "view" ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                {label}
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
