"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Brain,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Database,
  FolderGit2,
  HeartPulse,
  RefreshCw,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "./lib";
import { ManagerError } from "./ManagerStates";

interface OverviewResponse {
  counts: {
    skills: number;
    experiences: number;
    repos: number;
    featuredRepos: number;
    knowledge: number;
    contributionDays: number;
    contributionsYear: number;
  };
  profile: { updatedAt: string | null; completeness: number; name: string };
  system: {
    uptimeSec: number;
    nodeVersion: string;
    dbSizeBytes: number;
    selfPingEnabled: boolean;
    nextSyncAt: string | null;
    lastRun: { ok: boolean; at: string; total: number; error?: string } | null;
  };
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    });
  } catch {
    return iso;
  }
}

export default function OverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data, isLoading, isError, refetch } = useQuery<OverviewResponse>({
    queryKey: ["admin", "overview"],
    queryFn: () => api<OverviewResponse>("/api/admin/overview"),
    refetchInterval: 60_000,
  });

  if (isLoading) return <OverviewSkeleton />;
  if (isError || !data)
    return (
      <ManagerError
        message="Could not load the overview data."
        onRetry={() => refetch()}
      />
    );

  const { counts, profile, system } = data;

  const stats: { label: string; value: string; sub: string; icon: LucideIcon; tab: string }[] = [
    { label: "Skills", value: String(counts.skills), sub: "tech entries", icon: Zap, tab: "skills" },
    {
      label: "Experience",
      value: String(counts.experiences),
      sub: "timeline roles",
      icon: Briefcase,
      tab: "experiences",
    },
    {
      label: "Repos",
      value: String(counts.repos),
      sub: `${counts.featuredRepos} featured`,
      icon: FolderGit2,
      tab: "repos",
    },
    {
      label: "Knowledge",
      value: String(counts.knowledge),
      sub: "feature cards",
      icon: Brain,
      tab: "knowledge",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Content stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onNavigate(s.tab)}
            className="group flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <s.icon className="size-4.5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold leading-none tabular-nums">{s.value}</p>
              <p className="mt-1.5 text-sm font-medium leading-none">{s.label}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.sub}</p>
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Profile completeness */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <User className="size-4 text-primary" aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Profile completeness</h3>
                <p className="text-xs text-muted-foreground">{profile.name}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate("profile")}>
              Edit
            </Button>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{profile.completeness}%</span>
              <span className="text-xs text-muted-foreground">
                updated {formatDate(profile.updatedAt)}
              </span>
            </div>
            <Progress value={profile.completeness} className="mt-2 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Fills up as you add photo, bio, socials, GitHub username, résumé…
            </p>
          </div>
        </section>

        {/* GitHub sync */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="size-4 text-primary" aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold">GitHub activity sync</h3>
                <p className="text-xs text-muted-foreground">
                  {counts.contributionsYear.toLocaleString()} contributions tracked
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate("contributions")}>
              Manage
            </Button>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Last sync</dt>
              <dd className="flex items-center gap-1.5 text-right">
                {system.lastRun ? (
                  system.lastRun.ok ? (
                    <>
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" aria-hidden />
                      <span className="tabular-nums">
                        {formatDate(system.lastRun.at)} · {system.lastRun.total} days
                      </span>
                    </>
                  ) : (
                    <span className="text-destructive">{system.lastRun.error ?? "Failed"}</span>
                  )
                ) : (
                  <span className="text-muted-foreground">Never</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Next auto-sync</dt>
              <dd className="tabular-nums">{formatDate(system.nextSyncAt)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* System health */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <HeartPulse className="size-4 text-primary" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-semibold">System health</h3>
            <p className="text-xs text-muted-foreground">Live server telemetry</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <HealthItem
            icon={Clock3}
            label="Uptime"
            value={formatUptime(system.uptimeSec)}
          />
          <HealthItem
            icon={Database}
            label="Database size"
            value={formatBytes(system.dbSizeBytes)}
          />
          <HealthItem icon={Zap} label="Runtime" value={`Node ${system.nodeVersion}`} />
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5" aria-hidden />
              Self-ping keep-alive
            </p>
            <div className="mt-1.5">
              {system.selfPingEnabled ? (
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <CircleDashed className="size-3" aria-hidden />
                  Disabled
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HealthItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 font-medium tabular-nums">{value}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[95px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
