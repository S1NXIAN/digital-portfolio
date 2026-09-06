import { motionValue } from "framer-motion";

export type CursorVariant = "default" | "link" | "text" | "view";

/**
 * Shared, render-safe cursor state.
 *
 * Written by <CustomCursor /> (the only DOM listener) and read by any
 * decorative layer that should react to the pointer — the trailing glow,
 * the background orbs and the particle field. Motion values are used so
 * per-frame updates never trigger React re-renders; variant/label/pressed
 * only change when the hover target changes.
 */

/** Raw pointer position in client space (starts far offscreen). */
export const cursorX = motionValue(-9999);
export const cursorY = motionValue(-9999);

/** Pointer offset from the viewport center, normalized to -1 … 1. */
export const cursorNX = motionValue(0);
export const cursorNY = motionValue(0);

/** Flips to true on the first mousemove so consumers can snap their springs. */
export const cursorArmed = motionValue(false);

/** What the pointer is currently over (drives every reactive layer). */
export const cursorVariant = motionValue<CursorVariant>("default");
export const cursorLabel = motionValue("");
export const cursorPressed = motionValue(false);
export const cursorInside = motionValue(true);
