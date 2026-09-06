"use client";

import { ArrowUp, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import Magnetic from "@/components/motion/Magnetic";
import Reveal from "@/components/motion/Reveal";
import { SocialIcon } from "@/components/social-icons";
import { Button } from "@/components/ui/button";
import type { ProfileData } from "@/types/portfolio";

export default function Footer({
  profile,
  onOpenAdmin,
}: {
  profile: ProfileData;
  onOpenAdmin: () => void;
}) {
  const year = new Date().getFullYear();

  const copyEmail = async () => {
    if (!profile.email) return;
    try {
      await navigator.clipboard.writeText(profile.email);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Could not copy email");
    }
  };

  return (
    <footer
      id="contact"
      className="mt-auto border-t border-border/60 bg-card/40 py-10 backdrop-blur"
      aria-label="Contact and footer"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Let&rsquo;s build something{" "}
                <span className="text-gradient">worth shipping</span>
              </h2>
              {profile.email ? (
                <button
                  onClick={copyEmail}
                  className="group mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-4 py-2 font-mono text-sm text-muted-foreground transition-all duration-300 hover:border-primary/50 hover:text-primary"
                  aria-label={`Copy email address ${profile.email}`}
                >
                  {profile.email}
                  <Copy className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {profile.socials.map((social) => (
                <Magnetic key={social.label} strength={0.4}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary"
                  >
                    <SocialIcon name={social.icon} className="h-[17px] w-[17px]" />
                  </a>
                </Magnetic>
              ))}
            </div>

            <div className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />

            <div className="flex w-full flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
              <p>
                © {year} {profile.name}. Built with{" "}
                <span className="text-foreground">Next.js</span>,{" "}
                <span className="text-foreground">Framer Motion</span> &{" "}
                <span className="text-foreground">Tailwind CSS</span>.
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: object) => void } }).__lenis;
                    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
                    else window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="gap-1.5 text-xs text-muted-foreground/70 transition-colors hover:text-primary"
                  aria-label="Back to top"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  Top
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenAdmin}
                  className="gap-1.5 text-xs text-muted-foreground/70 transition-colors hover:text-primary"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden />
                  Owner access
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
