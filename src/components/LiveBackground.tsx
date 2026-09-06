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
    let rafId = 0;
    let running = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let themeColor: string = FALLBACK_COLOR;

    const mouse = { x: -9999, y: -9999 };

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
    };

    const draw = (): void => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Toroidal wrap so particles never pile up at the edges.
        if (p.x < -EDGE_MARGIN) p.x = width + EDGE_MARGIN;
        else if (p.x > width + EDGE_MARGIN) p.x = -EDGE_MARGIN;
        if (p.y < -EDGE_MARGIN) p.y = height + EDGE_MARGIN;
        else if (p.y > height + EDGE_MARGIN) p.y = -EDGE_MARGIN;

        // Particles flee the cursor — a radial push plus a tangential
        // swirl so the field orbits around the pointer instead of just
        // parting. Proximity is remembered for glow/link rendering.
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0.0001) {
          const falloff = 1 - dist / MOUSE_RADIUS;
          const push = falloff * MOUSE_PUSH;
          const ux = dx / dist;
          const uy = dy / dist;
          p.x += ux * push - uy * push * MOUSE_SWIRL;
          p.y += uy * push + ux * push * MOUSE_SWIRL;
          p.glow = Math.max(p.glow, falloff);
        } else {
          p.glow *= 0.9;
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

      // Links from the cursor itself to nearby particles — the
      // constellation visibly reaches toward the pointer.
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      for (const p of particles) {
        if (p.glow <= 0.01) continue;
        ctx.globalAlpha = p.glow * CURSOR_LINK_ALPHA;
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // Dots brighten and swell near the cursor.
      ctx.fillStyle = themeColor;
      for (const p of particles) {
        ctx.globalAlpha = PARTICLE_ALPHA + p.glow * GLOW_ALPHA_BOOST;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + p.glow * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = (): void => {
      if (!running) return;
      draw();
      rafId = requestAnimationFrame(step);
    };

    const start = (): void => {
      if (running) return;
      running = true;
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
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      stop();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
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
