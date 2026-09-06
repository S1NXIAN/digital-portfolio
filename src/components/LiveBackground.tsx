"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cursorNX, cursorNY } from "@/lib/cursor-state";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Cruise speed the particle eases back to after being kicked. */
  baseSpeed: number;
  /** Pre-computed rotation for a fixed, tiny per-frame heading drift. */
  cosSpin: number;
  sinSpin: number;
  /** Milliseconds spent continuously inside the cursor radius. */
  dwell: number;
  /** 0–1 build-up toward the 5s push-back; drives the countdown arc. */
  tension: number;
};

/** An expanding shockwave that nudges particles as its front passes. */
type Ring = {
  x: number;
  y: number;
  r: number;
  prevR: number;
  maxR: number;
  /** Impulse at the epicenter — falls off linearly to zero at maxR. */
  strength: number;
};

const LINK_DISTANCE = 120;
const LINK_ALPHA = 0.2;
/** Link opacities are quantized into buckets so lines batch into few strokes. */
const LINK_BUCKETS = 4;
const PARTICLE_ALPHA = 0.4;
/** Dots simply slide away when the pointer comes closer than this. */
const MOUSE_RADIUS = 130;
const MOUSE_PUSH = 0.5;
const MAX_SPEED = 0.22;
const EDGE_MARGIN = 24;
/** Dot count scales with screen area — bigger viewport, more dots. */
const AREA_PER_PARTICLE = 15000;
const MIN_PARTICLES = 40;
const MAX_PARTICLES = 220;
const FALLBACK_COLOR = "rgba(128, 128, 128, 1)";

/* ------------------------- interaction tuning ------------------------- */

/** Reach of a click shockwave (px) — intentionally modest. */
const IMPACT_RADIUS = 150;
/** Gentle velocity kick at the epicenter. */
const IMPACT_FORCE = 1.3;
/** Double-click nova scales both radius and force (still restrained). */
const NOVA_MULTIPLIER = 1.6;
/** Ring expansion speed, px per 16.7ms frame. */
const RING_SPEED = 4;
const RING_ALPHA = 0.22;
/** A press shorter than this is a click; holding longer is a gravity well. */
const HOLD_CLICK_MS = 240;
const HOLD_RADIUS = 190;
const HOLD_PULL = 0.12;
const HOLD_SWIRL = 0.28;
/** Outward fling when the well releases — grows with hold duration. */
const HOLD_FLING_BASE = 1.4;
const HOLD_FLING_MAX = 2.2;
/** Connected to the cursor for this long → pushed back. */
const DWELL_LIMIT_MS = 5000;
/** How fast dwell bleeds off outside the cursor radius (× real time). */
const DWELL_DECAY_RATE = 2.2;
const PUSHBACK_IMPULSE = 2.2;
const PUSHBACK_RING_RADIUS = 100;
const PUSHBACK_RING_FORCE = 1.2;
/** Hard cap for any velocity after a kick. */
const MAX_KICK = 2.6;
const MAX_KICK_SQ = MAX_KICK * MAX_KICK;
/** Per-frame ease back toward cruise speed after being disturbed. */
const SPEED_RECOVER = 0.035;

const ORB_PRIMARY_GRADIENT =
  "radial-gradient(circle, color-mix(in oklch, var(--primary) 30%, transparent), transparent 70%)";
const ORB_GLOW_GRADIENT =
  "radial-gradient(circle, color-mix(in oklch, var(--glow) 24%, transparent), transparent 70%)";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const subscribeReducedMotion = (onStoreChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getReducedMotionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getReducedMotionServerSnapshot = () => false;

/**
 * Site-wide ambient background: drifting emerald gradient orbs, a constellation
 * particle canvas, a masked dot grid and a film-grain overlay.
 *
 * Canvas interactions (kept deliberately light):
 *  - pointer near a dot → the dot simply slides away (plain avoidance)
 *  - click             → small shockwave; nearer dots get a slightly harder
 *                        nudge, with a faint expanding ring as feedback
 *  - double-click      → nova — wider and a bit stronger
 *  - press & hold      → gravity well pulls dots into a slow orbit; release
 *                        slingshots them back out
 *  - hover ≥ 5s        → a dot connected to the cursor builds a visible
 *                        countdown arc, then is pushed back with a mini ripple
 *  - dot count scales with screen size
 *
 * Entirely decorative — never intercepts pointer events, skipped (static
 * fallback) when the user prefers reduced motion.
 */
export default function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Constellation canvas — never mounted under reduced motion.
  useEffect(() => {
    if (reducedMotion) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rings: Ring[] = [];
    let rafId = 0;
    let running = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let themeColor: string = FALLBACK_COLOR;
    let lastFrame = performance.now();

    const mouse = { x: -9999, y: -9999 };

    // Gravity-well (press & hold) + nova detection state.
    let holding = false;
    let downAt = 0;
    let downX = 0;
    let downY = 0;
    let lastBurstAt = 0;
    let lastBurstX = 0;
    let lastBurstY = 0;

    // Reused per-frame segment buckets for batched link drawing.
    const linkSegments: number[][] = Array.from({ length: LINK_BUCKETS }, () => []);

    // Read the accent-aware color ONCE per theme change (not per frame).
    const readThemeColor = (): string =>
      getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() ||
      FALLBACK_COLOR;

    const spawn = (count: number): Particle[] => {
      const next: Particle[] = [];
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = MAX_SPEED * (0.35 + Math.random() * 0.65);
        // Fixed, tiny heading drift → smooth curved paths with zero
        // per-frame trigonometry (rotation terms are pre-computed).
        const spin = (Math.random() - 0.5) * 0.004;
        next.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1 + Math.random() * 1.2,
          baseSpeed: speed,
          cosSpin: Math.cos(spin),
          sinSpin: Math.sin(spin),
          dwell: 0,
          tension: 0,
        });
      }
      return next;
    };

    const resize = (): void => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = spawn(
        clamp(Math.floor((width * height) / AREA_PER_PARTICLE), MIN_PARTICLES, MAX_PARTICLES)
      );
      rings = [];
    };

    /** Spawn a shockwave; `nova` doubles down for double-clicks. */
    const burst = (x: number, y: number, nova: boolean): void => {
      const scale = nova ? NOVA_MULTIPLIER : 1;
      rings.push({
        x,
        y,
        r: 0,
        prevR: 0,
        maxR: IMPACT_RADIUS * scale,
        strength: IMPACT_FORCE * scale,
      });
    };

    const draw = (now: number): void => {
      const dtMs = clamp(now - lastFrame, 8, 50);
      lastFrame = now;
      const dt = dtMs / 16.667; // frame-normalized delta

      ctx.clearRect(0, 0, width, height);

      for (let n = 0; n < particles.length; n += 1) {
        const p = particles[n];

        // Fixed-curvature drift: rotate velocity by the pre-computed
        // per-particle rotation — smooth wandering, no trig per frame.
        const vx = p.vx * p.cosSpin - p.vy * p.sinSpin;
        const vy = p.vx * p.sinSpin + p.vy * p.cosSpin;
        p.vx = vx;
        p.vy = vy;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Toroidal wrap so particles never pile up at the edges.
        if (p.x < -EDGE_MARGIN) p.x = width + EDGE_MARGIN;
        else if (p.x > width + EDGE_MARGIN) p.x = -EDGE_MARGIN;
        if (p.y < -EDGE_MARGIN) p.y = height + EDGE_MARGIN;
        else if (p.y > height + EDGE_MARGIN) p.y = -EDGE_MARGIN;

        // Plain avoidance: when the pointer gets too close the dot simply
        // slides away from it. While the gravity well holds, attraction
        // takes over instead.
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const ux = distSq > 0.0001 ? dx / Math.sqrt(distSq) : 0;
        const uy = distSq > 0.0001 ? dy / Math.sqrt(distSq) : 0;
        const near = distSq < MOUSE_RADIUS * MOUSE_RADIUS;

        if (holding && distSq < HOLD_RADIUS * HOLD_RADIUS && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const pull = (1 - dist / HOLD_RADIUS) * HOLD_PULL * dt;
          p.vx += -ux * pull + -uy * pull * HOLD_SWIRL;
          p.vy += -uy * pull + ux * pull * HOLD_SWIRL;
          p.dwell = Math.max(0, p.dwell - dtMs * DWELL_DECAY_RATE);
        } else if (near && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / MOUSE_RADIUS) * MOUSE_PUSH * dt;
          p.x += ux * push;
          p.y += uy * push;
          // Dwell: how long this dot has stayed connected to the cursor.
          p.dwell = Math.min(p.dwell + dtMs, DWELL_LIMIT_MS);
        } else {
          p.dwell = Math.max(0, p.dwell - dtMs * DWELL_DECAY_RATE);
        }

        const tension = p.dwell / DWELL_LIMIT_MS;

        // 5-second rule: a dot that clings to the cursor too long is
        // pushed back with a gentle kick and its own mini ripple.
        if (p.dwell >= DWELL_LIMIT_MS && !holding && distSq > 0.0001) {
          p.vx += ux * PUSHBACK_IMPULSE;
          p.vy += uy * PUSHBACK_IMPULSE;
          p.dwell = 0;
          rings.push({
            x: p.x,
            y: p.y,
            r: 0,
            prevR: 0,
            maxR: PUSHBACK_RING_RADIUS,
            strength: PUSHBACK_RING_FORCE,
          });
        }
        p.tension = tension;

        // Shockwave fronts nudge particles as they sweep past. Impact
        // falls off linearly with distance — closer, slightly harder.
        for (let i = rings.length - 1; i >= 0; i -= 1) {
          const ring = rings[i];
          const rdx = p.x - ring.x;
          const rdy = p.y - ring.y;
          const rDistSq = rdx * rdx + rdy * rdy;
          const front = ring.r;
          if (rDistSq <= front * front && rDistSq > (ring.prevR - 24) * (ring.prevR - 24)) {
            const rDist = Math.sqrt(rDistSq);
            const power = ring.strength * (1 - rDist / ring.maxR);
            if (rDist > 0.5) {
              p.vx += (rdx / rDist) * power;
              p.vy += (rdy / rDist) * power;
            } else {
              const a = Math.random() * Math.PI * 2;
              p.vx += Math.cos(a) * power;
              p.vy += Math.sin(a) * power;
            }
          }
        }

        // Velocity settles back toward cruise speed after a disturbance.
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        if (speedSq > MAX_KICK_SQ) {
          const scale = MAX_KICK / Math.sqrt(speedSq);
          p.vx *= scale;
          p.vy *= scale;
        } else {
          const speed = Math.sqrt(speedSq) || 0.0001;
          const recover = 1 + (p.baseSpeed / speed - 1) * SPEED_RECOVER * dt;
          p.vx *= recover;
          p.vy *= recover;
        }
      }

      // Advance shockwaves.
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const ring = rings[i];
        ring.prevR = ring.r;
        ring.r += RING_SPEED * dt;
        if (ring.r >= ring.maxR) rings.splice(i, 1);
      }

      // Shockwave feedback — a single faint expanding ring.
      if (rings.length > 0) {
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1.2;
        for (const ring of rings) {
          ctx.globalAlpha = RING_ALPHA * (1 - ring.r / ring.maxR);
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Connective lines, opacity scaled by distance. Opacities are
      // quantized into a few buckets so each bucket is a single stroke
      // instead of one state change + stroke per line.
      for (let b = 0; b < LINK_BUCKETS; b += 1) linkSegments[b].length = 0;
      const maxDistSq = LINK_DISTANCE * LINK_DISTANCE;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxDistSq) continue;
          const t = 1 - Math.sqrt(distSq) / LINK_DISTANCE;
          const bucket = Math.min(LINK_BUCKETS - 1, (t * LINK_BUCKETS) | 0);
          const seg = linkSegments[bucket];
          seg.push(a.x, a.y, b.x, b.y);
        }
      }
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      for (let b = 0; b < LINK_BUCKETS; b += 1) {
        const seg = linkSegments[b];
        if (seg.length === 0) continue;
        ctx.globalAlpha = ((b + 0.5) / LINK_BUCKETS) * LINK_ALPHA;
        ctx.beginPath();
        for (let s = 0; s < seg.length; s += 4) {
          ctx.moveTo(seg[s], seg[s + 1]);
          ctx.lineTo(seg[s + 2], seg[s + 3]);
        }
        ctx.stroke();
      }

      // Dots (slight swell with dwell tension).
      ctx.fillStyle = themeColor;
      ctx.globalAlpha = PARTICLE_ALPHA;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + p.tension * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Countdown arcs — dots connected to the cursor show a filling ring
      // that visualizes the time left before they are pushed back.
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      for (const p of particles) {
        if (p.tension <= 0.02) continue;
        ctx.globalAlpha = 0.25 + p.tension * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3.5, -Math.PI / 2, -Math.PI / 2 + p.tension * Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const step = (now: number): void => {
      if (!running) return;
      draw(now);
      rafId = requestAnimationFrame(step);
    };

    const start = (): void => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      rafId = requestAnimationFrame(step);
    };

    const stop = (): void => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    // Re-read the theme color once per .dark class toggle on <html>.
    const themeObserver = new MutationObserver(() => {
      themeColor = readThemeColor();
    });

    const handleVisibility = (): void => {
      if (document.hidden) stop();
      else start();
    };

    const handleMouseMove = (event: MouseEvent): void => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleMouseLeave = (): void => {
      mouse.x = -9999;
      mouse.y = -9999;
      holding = false;
    };

    const handlePointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      holding = true;
      downAt = performance.now();
      downX = event.clientX;
      downY = event.clientY;
    };

    const handlePointerUp = (event: PointerEvent): void => {
      if (!holding) return;
      holding = false;
      const heldMs = performance.now() - downAt;
      const x = event.clientX || downX;
      const y = event.clientY || downY;

      if (heldMs < HOLD_CLICK_MS) {
        // Quick click → shockwave. Two rapid clicks in the same spot → nova.
        const now = performance.now();
        const nova = now - lastBurstAt < 350 && Math.hypot(x - lastBurstX, y - lastBurstY) < 40;
        burst(x, y, nova);
        lastBurstAt = now;
        lastBurstX = x;
        lastBurstY = y;
      } else {
        // Released gravity well → slingshot everything back outward.
        const fling = clamp(HOLD_FLING_BASE + (heldMs / 1000) * 0.35, HOLD_FLING_BASE, HOLD_FLING_MAX);
        const mx = mouse.x > -999 ? mouse.x : x;
        const my = mouse.y > -999 ? mouse.y : y;
        rings.push({ x: mx, y: my, r: 0, prevR: 0, maxR: 240, strength: fling });
      }
    };

    const handlePointerCancel = (): void => {
      holding = false;
    };

    const handleBlur = (): void => {
      holding = false;
    };

    const handleResize = (): void => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    };

    themeColor = readThemeColor();
    resize();
    start();

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerCancel, { passive: true });
    window.addEventListener("blur", handleBlur);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      stop();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleBlur);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [reducedMotion]);

  // Cursor parallax — orbs drift with/against the normalized pointer for
  // a subtle depth effect. Static under reduced motion.
  const parallaxX = useSpring(cursorNX, { stiffness: 45, damping: 20, mass: 0.9 });
  const parallaxY = useSpring(cursorNY, { stiffness: 45, damping: 20, mass: 0.9 });
  const restX = useMotionValue(0);
  const restY = useMotionValue(0);
  const activeX = reducedMotion ? restX : parallaxX;
  const activeY = reducedMotion ? restY : parallaxY;
  const orb1X = useTransform(activeX, (v) => v * 18);
  const orb1Y = useTransform(activeY, (v) => v * 12);
  const orb2X = useTransform(activeX, (v) => v * -22);
  const orb2Y = useTransform(activeY, (v) => v * -14);
  const orb3X = useTransform(activeX, (v) => v * -10);
  const orb3Y = useTransform(activeY, (v) => v * -7);

  // Without the animation classes the orbs render as static gradients.
  const orb1Anim = reducedMotion ? "" : "orb-1";
  const orb2Anim = reducedMotion ? "" : "orb-2";
  const orb3Anim = reducedMotion ? "" : "animate-floaty";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Layer A — ambient gradient orbs with cursor parallax */}
      <motion.div className="absolute inset-0" style={{ x: orb1X, y: orb1Y }}>
        <div
          className={`absolute -left-[12vw] -top-[14vh] h-[55vw] w-[55vw] rounded-full opacity-60 blur-3xl ${orb1Anim}`}
          style={{ background: ORB_PRIMARY_GRADIENT }}
        />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ x: orb2X, y: orb2Y }}>
        <div
          className={`absolute -bottom-[16vh] -right-[10vw] h-[45vw] w-[45vw] rounded-full opacity-60 blur-3xl ${orb2Anim}`}
          style={{ background: ORB_PRIMARY_GRADIENT }}
        />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ x: orb3X, y: orb3Y }}>
        <div
          className={`absolute -top-[10vh] right-[6vw] h-[30vw] w-[30vw] rounded-full opacity-40 blur-3xl ${orb3Anim}`}
          style={{ background: ORB_GLOW_GRADIENT }}
        />
      </motion.div>

      {/* Layer B — constellation particle field (skipped under reduced motion) */}
      {!reducedMotion && <canvas ref={canvasRef} className="absolute inset-0" />}

      {/* Layer C — masked dot grid */}
      <div className="dot-grid absolute inset-0" />

      {/* Film grain (fixed overlay texture) */}
      <div className="grain-overlay" aria-hidden="true" />
    </div>
  );
}
