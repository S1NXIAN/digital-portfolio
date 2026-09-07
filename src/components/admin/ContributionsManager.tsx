"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  CloudDownload,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { ContributionData } from "@/types/portfolio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, todayKey } from "./lib";
import { ConfirmDeleteDialog, Field, ManagerError } from "./ManagerStates";
import { LIMITS } from "@/lib/limits";

interface SyncLastRun {
  at: string;
  ok: boolean;
  username: string;
  trigger: string;
  message: string;
  synced?: number;
  total?: number;
  privateIncluded?: boolean;
}

interface SyncStatus {
  tokenConfigured: boolean;
  tokenSource: "env" | "db" | "none";
  lastRun: SyncLastRun | null;
  nextRunAt: string;
  schedule: string;
}

const phTime = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function untilStr(iso: string): string {
  let ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "soon";
  let h = Math.floor(ms / 3_600_000);
  let m = Math.round((ms % 3_600_000) / 60_000);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

export default function ContributionsManager() {
  const queryClient = useQueryClient();

  const invalidateData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] });
    await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  };

  // ---------------- Section 1 — sync from GitHub ----------------
  const profileQuery = useQuery<{ profile: { githubUsername?: string } }>({
    queryKey: ["admin", "profile"],
    queryFn: () => api<{ profile: { githubUsername?: string } }>("/api/admin/profile"),
  });
  const statusQuery = useQuery<SyncStatus>({
    queryKey: ["admin", "contributions", "sync-status"],
    queryFn: () => api<SyncStatus>("/api/admin/contributions/sync"),
    refetchInterval: 60_000,
  });

  const [username, setUsername] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (profileQuery.data?.profile?.githubUsername) {
      setUsername((u) => u || profileQuery.data!.profile.githubUsername!);
    }
  }, [profileQuery.data]);

  const saveToken = useMutation({
    mutationFn: (token: string) =>
      api<{ ok: boolean }>("/api/admin/contributions/sync", { method: "PUT", body: { token } }),
    onSuccess: async (_res, saved) => {
      setTokenInput("");
      toast.success(
        saved
          ? "GitHub token saved — syncs now include private commits"
          : "GitHub token removed — sync now requires a token to run"
      );
      await queryClient.invalidateQueries({
        queryKey: ["admin", "contributions", "sync-status"],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sync = async () => {
    if (!username.trim()) {
      toast.error("Enter a GitHub username first");
      return;
    }
    setSyncing(true);
    try {
      const res = await api<{ synced: number; total: number; privateIncluded: boolean }>(
        "/api/admin/contributions/sync",
        { method: "POST", body: { username: username.trim() } }
      );
      await invalidateData();
      await queryClient.invalidateQueries({
        queryKey: ["admin", "contributions", "sync-status"],
      });
      toast.success(
        `Synced ${res.synced} days · ${res.total.toLocaleString()} contributions${
          res.privateIncluded ? " · private included" : ""
        }`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed", {
        duration: 9000,
      });
    } finally {
      setSyncing(false);
    }
  };

  // ---------------- Section 2 — add / adjust a day ----------------
  const [date, setDate] = useState(todayKey());
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<"set" | "add">("add");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const upsert = useMutation({
    mutationFn: (payload: { date: string; count: number; mode: string; note?: string }) =>
      api<{ entry: ContributionData }>("/api/admin/contributions", {
        method: "POST",
        body: payload,
      }),
    onSuccess: async (_res, vars) => {
      await invalidateData();
      toast.success(`Saved ${vars.date} (${vars.mode === "add" ? "+" : "="} ${vars.count})`);
      setCount(1);
      setNote("");
      setFormError("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpsert = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormError("Pick a valid date");
      return;
    }
    if (!Number.isFinite(count) || count < 0) {
      setFormError("Count must be 0 or more");
      return;
    }
    setFormError("");
    upsert.mutate({
      date,
      count: Math.round(count),
      mode,
      note: note.trim() || undefined,
    });
  };

  // ---------------- Section 3 — recent entries ----------------
  const entriesQuery = useQuery<{ entries: ContributionData[] }>({
    queryKey: ["admin", "contributions"],
    queryFn: () =>
      api<{ entries: ContributionData[] }>("/api/admin/contributions?limit=120"),
  });

  const removeEntry = useMutation({
    mutationFn: (date: string) =>
      api(`/api/admin/contributions?date=${encodeURIComponent(date)}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await invalidateData();
      toast.success("Entry removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const entries = entriesQuery.data?.entries ?? [];
  const totalCommits = entries.reduce((acc, e) => acc + (e.count ?? 0), 0);
  const trackedDays = entries.length;
  const best = entries.reduce<ContributionData | null>(
    (acc, e) => (!acc || e.count > acc.count ? e : acc),
    null
  );

  const status = statusQuery.data;
  const lastRun = status?.lastRun ?? null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Flame className="size-4 text-primary" aria-hidden />}
          label="Total commits (recent)"
          value={totalCommits.toLocaleString()}
        />
        <StatCard
          icon={<CloudDownload className="size-4 text-primary" aria-hidden />}
          label="Tracked days"
          value={trackedDays.toLocaleString()}
        />
        <StatCard
          icon={<RefreshCw className="size-4 text-primary" aria-hidden />}
          label="Best day"
          value={best ? `${best.count}` : "0"}
          sub={best?.date}
        />
      </div>

      {/* Section 1 — sync */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Sync from GitHub</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Uses the GitHub GraphQL API with your token. When the token owner matches the
              username, the heatmap includes <span className="text-foreground">private commits</span>.
            </p>
          </div>
          {status ? (
            <Badge
              variant={status.tokenConfigured ? "default" : "outline"}
              className="shrink-0 gap-1"
            >
              <KeyRound className="size-3" aria-hidden />
              {status.tokenConfigured
                ? `Private sync ON${status.tokenSource === "env" ? " (.env)" : ""}`
                : "Private sync OFF"}
            </Badge>
          ) : null}
        </div>

        {/* schedule / status strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="min-w-0 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5 text-primary" aria-hidden />
              Auto-sync schedule
            </div>
            <p className="mt-1.5 text-sm font-medium">Daily · 12:00 AM PH time</p>
            <p className="text-[11px] text-muted-foreground">Asia/Manila (UTC+8)</p>
          </div>
          <div className="min-w-0 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5 text-primary" aria-hidden />
              Next auto-sync
            </div>
            <p className="mt-1.5 text-sm font-medium tabular-nums">
              {status ? untilStr(status.nextRunAt) : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {status ? phTime(status.nextRunAt) : "calculating…"}
            </p>
          </div>
          <div className="min-w-0 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {lastRun && !lastRun.ok ? (
                <CircleX className="size-3.5 text-destructive" aria-hidden />
              ) : (
                <CircleCheck
                  className={`size-3.5 ${lastRun ? "text-primary" : "text-muted-foreground"}`}
                  aria-hidden
                />
              )}
              Last sync
            </div>
            {lastRun ? (
              <>
                <p
                  className={`mt-1.5 truncate text-sm font-medium ${
                    lastRun.ok ? "" : "text-destructive"
                  }`}
                  title={lastRun.message}
                >
                  {lastRun.ok ? "Success" : "Failed"} · {timeAgo(lastRun.at)}
                </p>
                <p className="truncate text-[11px] text-muted-foreground" title={lastRun.message}>
                  {lastRun.trigger === "auto" ? "automatic" : "manual"} · {lastRun.message}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">No sync yet</p>
            )}
          </div>
        </div>

        {/* token box */}
        <div className="mt-4 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" aria-hidden />
            <span className="text-xs font-medium">GitHub token (classic, scope: read:user)</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Required for sync. With your own token the calendar includes private commits. Create
            one at{" "}
            <a
              href="https://github.com/settings/tokens/new?scopes=read:user&description=Portfolio+heatmap+sync"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              github.com/settings/tokens
            </a>{" "}
            — no repo access needed. Stored server-side; never shown again.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={status?.tokenConfigured ? "•••••••••••• (saved)" : "ghp_xxxxxxxxxxxx"}
                autoComplete="off"
                maxLength={LIMITS.githubToken}
                aria-label="GitHub token"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => saveToken.mutate(tokenInput.trim())}
                disabled={saveToken.isPending || !tokenInput.trim()}
              >
                {saveToken.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save token"}
              </Button>
              {status?.tokenConfigured && status.tokenSource === "db" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveToken.mutate("")}
                  disabled={saveToken.isPending}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* username + sync now */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="gh-username">GitHub username</Label>
            <Input
              id="gh-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="octocat"
            />
          </div>
          <Button onClick={sync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" aria-hidden />
                Sync now
              </>
            )}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sync overwrites day totals with GitHub&apos;s authoritative values (manual notes are
          kept). Nightly auto-sync runs at 12:00 AM PH time using this username.
        </p>
      </section>

      {/* Section 2 — add / adjust */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Add / adjust a day</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Overwrite a day&apos;s total or stack extra commits on top of the synced count.
        </p>
        <form onSubmit={handleUpsert} className="mt-4 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="contrib-date">
              <Input
                id="contrib-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Count" htmlFor="contrib-count">
              <Input
                id="contrib-count"
                type="number"
                min={0}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </Field>
            <Field label="Mode" htmlFor="contrib-mode">
              <Select value={mode} onValueChange={(v) => setMode(v as "set" | "add")}>
                <SelectTrigger id="contrib-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set total for this day</SelectItem>
                  <SelectItem value="add">Add to this day (extra commits)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Note (optional)" htmlFor="contrib-note">
            <Input
              id="contrib-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="private repo work"
              maxLength={80}
            />
          </Field>
          {formError ? (
            <p className="text-xs text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save day"
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Section 3 — recent entries */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Recent entries</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Last 120 tracked days, newest first.
            </p>
          </div>
          {entriesQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
        </div>

        {entriesQuery.isLoading ? (
          <div className="mt-4 space-y-2" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : entriesQuery.isError ? (
          <div className="mt-4">
            <ManagerError
              message="Could not load contribution entries."
              onRetry={() => entriesQuery.refetch()}
            />
          </div>
        ) : entries.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No tracked days yet — sync from GitHub or add a day above.
          </p>
        ) : (
          // Native scroll container: Radix ScrollArea can't size a viewport
          // against a max-height-only root, which let rows spill past the
          // card. A real overflow box clips + scrolls correctly.
          <div className="mt-4 max-h-96 overflow-y-auto pr-3" data-lenis-prevent>
            <ul className="divide-y divide-border">
              {entries.map((entry) => (
                <li
                  key={entry.date}
                  className="flex items-center gap-2 py-2.5 text-sm first:pt-0 last:pb-0 sm:gap-3"
                >
                  <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-foreground sm:w-28">
                    {entry.date}
                  </span>
                  <Badge variant="secondary" className="tabular-nums">
                    {entry.count}
                  </Badge>
                  {entry.note ? (
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {entry.note}
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1" />
                  )}
                  <ConfirmDeleteDialog
                    title={`Delete ${entry.date}?`}
                    description="The day will disappear from the heatmap. This action cannot be undone."
                    onConfirm={() => removeEntry.mutate(entry.date)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sub ? <span className="font-mono text-xs text-muted-foreground">{sub}</span> : null}
      </div>
    </div>
  );
}
