"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import type { ProfileData } from "@/types/portfolio";

const LINKS = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Repos", href: "#repos" },
  { label: "Activity", href: "#activity" },
];

export default function Nav({
  profile,
  onOpenAdmin,
}: {
  profile: ProfileData;
  onOpenAdmin: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl border px-3 transition-colors duration-300 sm:px-4 ${
          scrolled
            ? "border-border/80 bg-background/80 shadow-lg shadow-black/[0.04] backdrop-blur-xl"
            : "border-transparent bg-background/40 backdrop-blur-md"
        }`}
        aria-label="Primary"
      >
        <a href="#top" className="group flex min-w-0 items-center gap-2.5" aria-label="Back to top">
          <Avatar className="h-8 w-8 border border-border/60 transition-transform duration-300 group-hover:scale-110">
            <AvatarImage src={profile.photoUrl} alt={`${profile.name} avatar`} />
            <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
              {profile.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden truncate text-sm font-semibold tracking-tight sm:block">
            {profile.name}
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200 ${
                active === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active === link.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenAdmin}
            aria-label="Owner access"
            title="Owner access"
            className="h-9 w-9 rounded-full text-muted-foreground transition-colors hover:text-primary"
          >
            <Lock className="h-[17px] w-[17px]" />
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="rounded-b-3xl border-border/70">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="mt-4 flex flex-col gap-1 pb-4" aria-label="Mobile">
                {LINKS.map((link, i) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-accent hover:text-primary"
                  >
                    <span className="mr-3 font-mono text-xs text-primary">0{i + 1}</span>
                    {link.label}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </motion.nav>
      <AnimatePresence />
    </header>
  );
}
