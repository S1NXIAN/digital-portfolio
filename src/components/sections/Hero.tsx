"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, Copy, Download, MapPin } from "lucide-react";
import { toast } from "sonner";
import Magnetic from "@/components/motion/Magnetic";
import { SocialIcon } from "@/components/social-icons";
import { Button } from "@/components/ui/button";
import type { ProfileData } from "@/types/portfolio";

function RotatingWords({ words }: { words: string[] }) {
  const list = words.length > 0 ? words : ["Software Engineer"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), 2600);
    return () => clearInterval(t);
  }, [list.length]);

  return (
    <span className="relative inline-flex h-[1.4em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={{ y: "105%", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-105%", opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-gradient whitespace-nowrap font-semibold"
        >
          {list[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function NameReveal({ name }: { name: string }) {
  const words = name.split(" ");
  return (
    <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
      {words.map((word, wi) => (
        <span key={wi} className="mr-[0.28em] inline-block overflow-hidden pb-1 align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 + wi * 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

export default function Hero({
  profile,
  totalCommits,
  repoCount,
}: {
  profile: ProfileData;
  totalCommits: number;
  repoCount: number;
}) {
  const { scrollY } = useScroll();
  const photoY = useTransform(scrollY, [0, 600], [0, 70]);
  const textY = useTransform(scrollY, [0, 600], [0, 30]);

  const copyEmail = async () => {
    if (!profile.email) {
      toast.error("No email set — add one in the admin panel");
      return;
    }
    try {
      await navigator.clipboard.writeText(profile.email);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Could not copy email");
    }
  };

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-24 pt-32"
      aria-label="Introduction"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div style={{ y: textY }} className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="animate-pulse-ring inline-block h-2 w-2 rounded-full bg-primary" />
              {profile.availability || "Open to work"}
            </span>
            {profile.location ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </span>
            ) : null}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="mt-6 font-mono text-sm text-primary"
          >
            {"// hello world, I'm"}
          </motion.p>

          <NameReveal name={profile.name} />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 text-xl text-muted-foreground sm:text-2xl"
          >
            <RotatingWords words={profile.rotatingWords} />
          </motion.div>

          {profile.bio ? (
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.68, duration: 0.6 }}
              className="mt-6 max-w-xl leading-relaxed text-muted-foreground"
            >
              {profile.bio}
            </motion.p>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <a href="#repos">
                <Button size="lg" className="group rounded-full pr-4 shadow-lg shadow-primary/25">
                  View my work
                  <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                </Button>
              </a>
            </Magnetic>
            <Magnetic>
              <Button
                size="lg"
                variant="outline"
                onClick={copyEmail}
                className="group rounded-full border-border/80 bg-card/60 backdrop-blur"
              >
                Get in touch
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Button>
            </Magnetic>
            {profile.resumeUrl ? (
              <Magnetic strength={0.25}>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="rounded-full border-border/80 bg-card/60 backdrop-blur"
                >
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download résumé (opens in new tab)"
                    data-cursor="view"
                    data-cursor-label="Open"
                  >
                    Résumé
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </Magnetic>
            ) : null}
            {profile.email ? (
              <Magnetic strength={0.25}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyEmail}
                  aria-label={`Copy email ${profile.email}`}
                  className="h-11 w-11 rounded-full text-muted-foreground hover:text-primary"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </Magnetic>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95, duration: 0.6 }}
            className="mt-8 flex items-center gap-2"
          >
            {profile.socials.map((social) => (
              <Magnetic key={social.label} strength={0.45}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/50 text-muted-foreground backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary"
                >
                  <SocialIcon name={social.icon} className="h-[18px] w-[18px]" />
                </a>
              </Magnetic>
            ))}
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.7 }}
            className="mt-10 flex flex-wrap gap-x-10 gap-y-4"
          >
            {[
              { value: profile.yearsExperience, suffix: "+", label: "years of experience" },
              { value: totalCommits, suffix: "", label: "commits · last 12 mo" },
              { value: repoCount, suffix: "", label: "featured repos" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {stat.value}
                  <span className="text-primary">{stat.suffix}</span>
                </dd>
                <dd className="mt-0.5 text-xs text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* Portrait */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ y: photoY }}
          className="relative mx-auto w-full max-w-[340px]"
        >
          <div
            className="absolute -inset-3 rounded-[2.2rem] opacity-60 blur-2xl"
            style={{
              background:
                "radial-gradient(60% 60% at 30% 20%, color-mix(in oklch, var(--primary) 35%, transparent), transparent), radial-gradient(50% 50% at 75% 85%, color-mix(in oklch, var(--glow) 30%, transparent), transparent)",
            }}
            aria-hidden
          />
          <div className="sheen relative rounded-[2rem] border border-border/70 bg-card/70 p-2.5 shadow-2xl backdrop-blur">
            <div
              className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem]"
              data-cursor="view"
              data-cursor-label="Hello"
            >
              <img
                src={profile.photoUrl || "/avatar.png"}
                alt={`Portrait of ${profile.name}`}
                width={512}
                height={512}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                aria-hidden
              />
            </div>
            <div className="absolute -right-4 top-8 animate-floaty rounded-2xl border border-border/70 bg-card/85 px-3.5 py-2.5 shadow-xl backdrop-blur">
              <p className="text-[11px] font-medium text-muted-foreground">Currently</p>
              <p className="text-xs font-semibold text-primary">
                {profile.availability || "Open to work"}
              </p>
            </div>
            <div className="absolute -left-4 bottom-10 animate-floaty-delayed rounded-2xl border border-border/70 bg-card/85 px-3.5 py-2.5 shadow-xl backdrop-blur">
              <p className="text-[11px] font-medium text-muted-foreground">Shipping since</p>
              <p className="text-xs font-semibold">{new Date().getFullYear() - profile.yearsExperience}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary sm:flex"
        aria-label="Scroll to about section"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.2em]">scroll</span>
        <span className="flex h-8 w-5 items-start justify-center rounded-full border-2 border-current p-1">
          <motion.span
            className="h-1.5 w-1 rounded-full bg-current"
            animate={{ y: [0, 10, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.a>
    </section>
  );
}
