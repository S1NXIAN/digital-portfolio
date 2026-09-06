"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { RefreshCw, WifiOff } from "lucide-react";
import Nav from "@/components/Nav";
import About from "@/components/sections/About";
import Experience from "@/components/sections/Experience";
import Footer from "@/components/sections/Footer";
import Heatmap from "@/components/sections/Heatmap";
import Hero from "@/components/sections/Hero";
import Motto from "@/components/sections/Motto";
import Repos from "@/components/sections/Repos";
import Skills from "@/components/sections/Skills";
import StackMarquee from "@/components/sections/StackMarquee";
import { Button } from "@/components/ui/button";
import type { PortfolioResponse } from "@/types/portfolio";

async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error(`Failed to load portfolio (${res.status})`);
  return res.json();
}

function LoadingState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        className="h-12 w-12 rounded-full border-2 border-border border-t-primary"
        aria-hidden
      />
      <p className="font-mono text-sm text-muted-foreground">compiling pixels…</p>
      <span className="sr-only">Loading portfolio</span>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <WifiOff className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="font-semibold">Something broke while loading</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The portfolio data could not be fetched. Check the server and try again.
        </p>
      </div>
      <Button onClick={onRetry} variant="outline" className="gap-2 rounded-full">
        <RefreshCw className="h-4 w-4" aria-hidden />
        Retry
      </Button>
    </div>
  );
}

export default function Portfolio({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
  });

  if (isLoading || !data) {
    return isError ? <ErrorState onRetry={() => refetch()} /> : <LoadingState />;
  }

  const profile = data.profile;
  const totalCommits = data.contributions.reduce((sum, c) => sum + c.count, 0);

  if (!profile) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav profile={profile} onOpenAdmin={onOpenAdmin} />
      <main className="flex-1">
        <Hero profile={profile} totalCommits={totalCommits} repoCount={data.repos.length} />
        <StackMarquee skills={data.skills} />
        <About
          profile={profile}
          knowledge={data.knowledge}
          skillCount={data.skills.length}
          repoCount={data.repos.length}
          totalCommits={totalCommits}
        />
        <Skills skills={data.skills} />
        <Experience experiences={data.experiences} />
        <Repos repos={data.repos} />
        <Heatmap contributions={data.contributions} username={profile.githubUsername} />
        <Motto profile={profile} />
      </main>
      <Footer profile={profile} onOpenAdmin={onOpenAdmin} />
    </div>
  );
}
