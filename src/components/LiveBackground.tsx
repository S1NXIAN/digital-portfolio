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
  /** 0–1 proximity to the cursor; drives brightening + cursor links. */
  glow: number;
  /** Cruise speed the particle eases back to after being kicked around. */
  baseSpeed: number;
  /** Per-particle phase for the slow organic wander. */
  phase: number;
  /** Milliseconds spent continuously inside the cursor radius. */
  dwell: number;
  /** 0–1 build-up toward the 5s push-back; drives arcs + link strain. */
  tension: number;
};

/** An expanding shockwave that kicks particles as its front passes over them. */
type Ring = {
  x: number;
  y: number;
  r: number;
  prevR: number;
  maxR: number;
  /** Impulse at the epicenter — falls off linearly to zero at maxR. */
  strength: number;
};

const LINK_DISTANCE = 130;
const LINK_ALPHA = 0.22;
const PARTICLE_ALPHA = 0.45;
const MOUSE_RADIUS = 140;
const MOUSE_PUSH = 0.55;
const MOUSE_SWIRL = 0.5;
const CURSOR_LINK_ALPHA = 0.3;
const GLOW_ALPHA_BOOST = 0.45;
const MAX_SPEED = 0.25;
const EDGE_MARGIN = 24;
const AREA_PER_PARTICLE = 22000;
const MIN_PARTICLES = 36;
const MAX_PARTICLES = 90;
const FALLBACK_COLOR = "rgba(128, 128, 128, 1)";

/* ------------------------- interaction tuning ------------------------- */

/** Reach of a click shockwave (px). */
const IMPACT_RADIUS = 240;
/** Velocity kick at the epicenter — closer dots scatter harder. */
const IMPACT_FORCE = 3.4;
/** Double-click nova scales both radius and force. */
const NOVA_MULTIPLIER = 1.7;
/** Ring expansion speed, px per 16.7ms frame. */
const RING_SPEED = 5.2;
/** A click shorter than this is a burst; holding longer is a gravity well. */
const HOLD_CLICK_MS = 240;
const HOLD_RADIUS = 210;
const HOLD_PULL = 0.14;
const HOLD_SWIRL = 0.3;
/** Outward fling when the well releases — grows with hold duration. */
const HOLD_FLING_BASE = 1.8;
const HOLD_FLING_MAX = 2.8;
/** Connected to the cursor for this long → pushed back. */
const DWELL_LIMIT_MS = 5000;
/** How fast dwell bleeds off outside the cursor radius (× real time). */
const DWELL_DECAY_RATE = 2.2;
const PUSHBACK_IMPULSE = 3.6;
const PUSHBACK_RING_RADIUS = 120;
const PUSHBACK_RING_FORCE = 1.9;
/** Fast cursor swipes drag nearby dots along ("wind"). */
const WIND_COUPLE = 0.05;
/** Hard cap for any velocity after kicks. */
const MAX_KICK = 4.6;
/** Per-frame ease back toward cruise speed after being disturbed. */
const SPEED_RECOVER = 0.028;

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
 * Canvas interactions (desktop pointer + touch taps):
 *  - click            → shockwave; nearer dots scatter harder, visible ring
 *  - double-click     → nova — wider and far more violent
 *  - press & hold     → gravity well pulls dots into orbit; release flings them
 *  - hover ≥ 5s       → a dot connected to the cursor builds tension (countdown
 *                       arc) and is then pushed back with its own mini ripple
 *  - fast swipes      → cursor wind drags nearby dots along
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
    let prevMouseX = -9999;
    let prevMouseY = -9999;
    let mouseVX = 0;
    let mouseVY = 0;

    // Gravity-well (press & hold) state.
    let holding = false;
    let downAt = 0;
    let downX = 0;
    let downY = 0;

    // Double-click nova detection.
    let lastBurstAt = 0;
    let lastBurstX = 0;
    let lastBurstY = 0;

    // Read the accent-aware color ONCE per theme change (not per frame).
    const readThemeColor = (): string =>
      getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() ||
      FALLBACK_COLOR;

    const spawn = (count: number): Particle[] => {
      const next: Particle[] = [];
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = MAX_SPEED * (0.35 + Math.random() * 0.65);
        next.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1 + Math.random() * 1.2,
          glow: 0,
          baseSpeed: speed,
          phase: Math.random() * Math.PI * 2,
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

      // Cursor velocity ("wind") — zero when the pointer is parked/offscreen.
      if (mouse.x > -999) {
        mouseVX = mouse.x - prevMouseX;
        mouseVY = mouse.y - prevMouseY;
      } else {
        mouseVX = 0;
        mouseVY = 0;
      }
      prevMouseX = mouse.x;
      prevMouseY = mouse.y;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        // Organic wander — the velocity vector slowly rotates so dots curve
        // instead of coasting in straight lines.
        const rot = Math.sin(now * 0.00045 + p.phase) * 0.0035 * dt;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const wx = p.vx * cosR - p.vy * sinR;
        const wy = p.vx * sinR + p.vy * cosR;
        p.vx = wx;
        p.vy = wy;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Toroidal wrap so particles never pile up at the edges.
        if (p.x < -EDGE_MARGIN) p.x = width + EDGE_MARGIN;
        else if (p.x > width + EDGE_MARGIN) p.x = -EDGE_MARGIN;
        if (p.y < -EDGE_MARGIN) p.y = height + EDGE_MARGIN;
        else if (p.y > height + EDGE_MARGIN) p.y = -EDGE_MARGIN;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const ux = dist > 0.0001 ? dx / dist : 0;
        const uy = dist > 0.0001 ? dy / dist : 0;

        let falloff = 0;
        if (!holding && dist < MOUSE_RADIUS && dist > 0.0001) {
          // Particles flee the cursor — radial push + tangential swirl, and
          // fast swipes drag them along like wind. Proximity is remembered
          // for glow/link rendering.
          falloff = 1 - dist / MOUSE_RADIUS;
          const push = falloff * MOUSE_PUSH * dt;
          p.x += ux * push - uy * push * MOUSE_SWIRL;
          p.y += uy * push + ux * push * MOUSE_SWIRL;
          p.vx += mouseVX * WIND_COUPLE * falloff;
          p.vy += mouseVY * WIND_COUPLE * falloff;
          p.glow = Math.max(p.glow, falloff);

          // Dwell: how long this dot has stayed connected to the cursor.
          p.dwell = Math.min(p.dwell + dtMs, DWELL_LIMIT_MS);
        } else {
          p.glow *= Math.pow(0.9, dt);
          // While holding, the gravity well owns the neighborhood — dwell
          // bleeds off instead of building (no push-back fights the well).
          p.dwell = Math.max(0, p.dwell - dtMs * DWELL_DECAY_RATE);
        }

        const tension = p.dwell / DWELL_LIMIT_MS;

        // 5-second rule: a dot that clings to the cursor too long is
        // ejected with a strong outward kick and its own mini ripple.
        if (p.dwell >= DWELL_LIMIT_MS && !holding && dist > 0.0001) {
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

        // Gravity well — while pressed, nearby dots are pulled into a
        // slow orbit around the pointer.
        if (holding && dist < HOLD_RADIUS && dist > 1) {
          const pull = (1 - dist / HOLD_RADIUS) * HOLD_PULL * dt;
          p.vx += -ux * pull + -uy * pull * HOLD_SWIRL;
          p.vy += -uy * pull + ux * pull * HOLD_SWIRL;
          p.glow = Math.max(p.glow, 1 - dist / HOLD_RADIUS);
        }

        // Shockwave fronts kick particles as they sweep past. Impact falls
        // off linearly with distance — the closer, the harder the hit.
        for (let i = rings.length - 1; i >= 0; i -= 1) {
          const ring = rings[i];
          const rdx = p.x - ring.x;
          const rdy = p.y - ring.y;
          const rDist = Math.hypot(rdx, rdy);
          if (rDist <= ring.r && rDist > ring.prevR - 24) {
            const power = ring.strength * (1 - rDist / ring.maxR);
            if (rDist > 0.5) {
              p.vx += (rdx / rDist) * power;
              p.vy += (rdy / rDist) * power;
            } else {
              const a = Math.random() * Math.PI * 2;
              p.vx += Math.cos(a) * power;
              p.vy += Math.sin(a) * power;
            }
            p.glow = Math.max(p.glow, 0.55);
          }
        }

        // Velocity settles back toward cruise speed after any disturbance.
        const speed = Math.hypot(p.vx, p.vy) || 0.0001;
        const recover = 1 + (p.baseSpeed / speed - 1) * SPEED_RECOVER * dt;
        p.vx *= recover;
        p.vy *= recover;
        const settled = Math.hypot(p.vx, p.vy);
        if (settled > MAX_KICK) {
          p.vx *= MAX_KICK / settled;
          p.vy *= MAX_KICK / settled;
        }

        p.tension = tension;
      }

      // Advance shockwaves.
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const ring = rings[i];
        ring.prevR = ring.r;
        ring.r += RING_SPEED * dt;
        if (ring.r >= ring.maxR) rings.splice(i, 1);
      }

      // Shockwave rings — a bright leading edge with a faint echo inside.
      ctx.strokeStyle = themeColor;
      for (const ring of rings) {
        const life = 1 - ring.r / ring.maxR;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.35 * life;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        if (ring.r > 12) {
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.14 * life;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.r * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Connective lines, opacity scaled by distance.
      ctx.lineWidth = 1;
      ctx.strokeStyle = themeColor;
      const maxDistSq = LINK_DISTANCE * LINK_DISTANCE;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxDistSq) continue;
          ctx.globalAlpha = (1 - Math.sqrt(distSq) / LINK_DISTANCE) * LINK_ALPHA;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Links from the cursor to nearby particles. A dot nearing its 5s
      // limit strains the link — it thickens and brightens with tension.
      for (const p of particles) {
        if (p.glow <= 0.01) continue;
        ctx.globalAlpha = p.glow * (CURSOR_LINK_ALPHA + p.tension * 0.25);
        ctx.lineWidth = 1 + p.tension * 1.2;
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.lineWidth = 1;

      // Countdown arcs — dots connected to the cursor show a filling ring
      // that visualizes the time left before they are pushed back.
      ctx.strokeStyle = themeColor;
      for (const p of particles) {
        if (p.tension <= 0.02) continue;
        ctx.globalAlpha = 0.28 + p.tension * 0.42;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3.5, -Math.PI / 2, -Math.PI / 2 + p.tension * Math.PI * 2);
        ctx.stroke();
      }

      // Dots brighten and swell near the cursor (and with tension).
      ctx.fillStyle = themeColor;
      for (const p of particles) {
        ctx.globalAlpha = PARTICLE_ALPHA + p.glow * GLOW_ALPHA_BOOST;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + p.glow * 0.9 + p.tension * 1.1, 0, Math.PI * 2);
        ctx.fill();
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
        const nova =
          performance.now() - lastBurstAt < 350 &&
          Math.hypot(x - lastBurstX, y - lastBurstY) < 40;
        burst(x, y, nova);
        lastBurstAt = performance.now();
        lastBurstX = x;
        lastBurstY = y;
      } else {
        // Released gravity well → slingshot everything outward. The longer
        // the hold, the harder the fling.
        const fling = clamp(HOLD_FLING_BASE + heldMs / 1000 * 0.4, HOLD_FLING_BASE, HOLD_FLING_MAX);
        const mx = mouse.x > -999 ? mouse.x : x;
        const my = mouse.y > -999 ? mouse.y : y;
        rings.push({ x: mx, y: my, r: 0, prevR: 0, maxR: 300, strength: fling });
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
