"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  CloudDownload,
  ExternalLink,
  GitFork,
  Loader2,
  Pencil,
  Plus,
  SearchX,
  Star,
} from "lucide-react";
import type { RepoData } from "@/types/portfolio";
import { langColor } from "@/lib/lang-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "./lib";
import DragList from "./DragList";
import {
  ConfirmDeleteDialog,
  EmptyState,
  Field,
  ManagerError,
  ManagerLoading,
  ManagerToolbar,
} from "./ManagerStates";
import { usePersistedReorder } from "./use-reorder";

interface ReposSyncStatus {
  username: string;
  nextRunAt: string;
  lastRun: {
    at: string;
    ok: boolean;
    username: string;
    trigger: string;
    message: string;
    updated?: number;
    added?: number;
  } | null;
}

function phTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function untilStr(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "soon";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RepoManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ items: RepoData[] }>({
    queryKey: ["admin", "repos"],
    queryFn: () => api<{ items: RepoData[] }>("/api/admin/repos"),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RepoData | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [topics, setTopics] = useState("");
  const [stars, setStars] = useState(0);
  const [forks, setForks] = useState(0);
  const [featured, setFeatured] = useState(true);
  const [error, setError] = useState("");
  const [pulling, setPulling] = useState(false);

  // ---------------- GitHub metadata sync ----------------
  const [syncing, setSyncing] = useState(false);
  const syncStatus = useQuery<ReposSyncStatus>({
    queryKey: ["admin", "repos", "sync-status"],
    queryFn: () => api<ReposSyncStatus>("/api/admin/repos/sync"),
    refetchInterval: 60_000,
  });
  const status = syncStatus.data;

  const profileQuery = useQuery<{ profile: { githubUsername?: string } }>({
    queryKey: ["admin", "profile"],
    queryFn: () => api<{ profile: { githubUsername?: string } }>("/api/admin/profile"),
    staleTime: 5 * 60_000,
  });
  const ghUsername = status?.username || profileQuery.data?.profile?.githubUsername || "";

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "repos"] });
    await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  };

  const syncNow = async () => {
    if (!ghUsername.trim()) {
      toast.error("Set your GitHub username in the Profile tab first");
      return;
    }
    setSyncing(true);
    try {
      const res = await api<{ updated: number; added: number; username: string }>(
        "/api/admin/repos/sync",
        { method: "POST", body: {} }
      );
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["admin", "repos", "sync-status"] });
      toast.success(
        `Synced ${res.username} — ${res.updated} updated, ${res.added} added`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed", { duration: 9000 });
    } finally {
      setSyncing(false);
    }
  };

  // ---------------- list + dnd ----------------
  const [search, setSearch] = useState("");
  const allItems = useMemo(() => data?.items ?? [], [data]);
  const needle = search.trim().toLowerCase();
  const items = useMemo(
    () =>
      needle
        ? allItems.filter(
            (r) =>
              r.name.toLowerCase().includes(needle) ||
              (r.description ?? "").toLowerCase().includes(needle) ||
              (r.language ?? "").toLowerCase().includes(needle) ||
              (r.topics ?? "").toLowerCase().includes(needle)
          )
        : allItems,
    [allItems, needle]
  );
  const filtering = needle.length > 0;

  const { persist } = usePersistedReorder("repos", ["admin", "repos"]);
  const onReorder = (next: RepoData[]) => void persist(next, "Repo order updated");
  const onKeyboardMove = (visibleIndex: number, dir: -1 | 1) => {
    const next = [...items];
    const target = visibleIndex + dir;
    if (target < 0 || target >= next.length) return;
    [next[visibleIndex], next[target]] = [next[target], next[visibleIndex]];
    onReorder(next);
  };

  const toggleFeatured = useMutation({
    mutationFn: (repo: RepoData) =>
      api(`/api/admin/repos/${repo.id}`, { method: "PUT", body: { featured: !repo.featured } }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/repos/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Repo deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---------------- editor ----------------
  const openAdd = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setUrl("");
    setLanguage("");
    setTopics("");
    setStars(0);
    setForks(0);
    setFeatured(true);
    setError("");
    setOpen(true);
  };

  const openEdit = (item: RepoData) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description ?? "");
    setUrl(item.url);
    setLanguage(item.language ?? "");
    setTopics(item.topics ?? "");
    setStars(item.stars ?? 0);
    setForks(item.forks ?? 0);
    setFeatured(item.featured);
    setError("");
    setOpen(true);
  };

  const pullFromGithub = async () => {
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]/i.test(url.trim())) {
      toast.error("Enter a github.com repo URL first");
      return;
    }
    setPulling(true);
    try {
      const res = await api<{
        meta: {
          name: string;
          description: string;
          language: string;
          topics: string;
          stars: number;
          forks: number;
        };
      }>("/api/admin/repos/fetch", { method: "POST", body: { url: url.trim() } });
      setName((n) => res.meta.name || n);
      setDescription(res.meta.description);
      setLanguage(res.meta.language);
      setTopics(res.meta.topics);
      setStars(res.meta.stars);
      setForks(res.meta.forks);
      toast.success("Pulled the latest metadata from GitHub");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setPulling(false);
    }
  };

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      editing
        ? api(`/api/admin/repos/${editing.id}`, { method: "PUT", body: payload })
        : api("/api/admin/repos", { method: "POST", body: payload }),
    onSuccess: async () => {
      await invalidate();
      toast.success(editing ? "Repo updated" : "Repo added");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Repo name is required");
      return;
    }
    if (!url.trim().startsWith("https://")) {
      setError("URL must start with https://");
      return;
    }
    setError("");
    save.mutate({
      name: name.trim(),
      description,
      url: url.trim(),
      language: language.trim(),
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .join(","),
      stars: Math.max(0, Math.round(stars || 0)),
      forks: Math.max(0, Math.round(forks || 0)),
      featured,
    });
  };

  if (isLoading) return <ManagerLoading />;
  if (isError) return <ManagerError message="Could not load repos." onRetry={() => refetch()} />;

  const lastRun = status?.lastRun ?? null;

  return (
    <div className="space-y-4">
      {/* GitHub metadata sync strip */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <CloudDownload className="size-4 text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">GitHub metadata sync</h2>
                <p className="text-xs text-muted-foreground">
                  {ghUsername
                    ? `Keeps names, descriptions, languages, topics, stars & forks fresh for ${ghUsername}.`
                    : "Set a GitHub username in the Profile tab to enable syncing."}
                </p>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={syncNow} disabled={syncing} className="shrink-0">
            {syncing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Syncing…
              </>
            ) : (
              <>
                <CloudDownload className="size-4" aria-hidden />
                Sync now
              </>
            )}
          </Button>
        </div>

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
              <CloudDownload className="size-3.5 text-primary" aria-hidden />
              Next auto-sync
            </div>
            <p className="mt-1.5 text-sm font-medium tabular-nums">
              {status ? untilStr(status.nextRunAt) : "—"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
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
                <p
                  className="truncate text-[11px] text-muted-foreground"
                  title={lastRun.message}
                >
                  {lastRun.trigger === "auto" ? "automatic" : "manual"} · {lastRun.message}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">No sync yet</p>
            )}
          </div>
        </div>
      </section>

      <ManagerToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search repos, languages, topics…"
        count={items.length}
        totalCount={allItems.length}
      >
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" aria-hidden />
          Add repo
        </Button>
      </ManagerToolbar>

      {items.length === 0 ? (
        <EmptyState
          message={
            allItems.length === 0
              ? "No repos yet. Add your first repository or run a sync."
              : `No repos match “${search}”.`
          }
        />
      ) : (
        <>
          {filtering ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <SearchX className="size-3.5 shrink-0" aria-hidden />
              Drag is paused while searching — clear the search to re-order.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Drag the handle to set the order shown on the public Repositories section.
            </p>
          )}

          <DragList
            items={items}
            onReorder={onReorder}
            onKeyboardMove={onKeyboardMove}
            disabled={filtering}
            className="space-y-3"
            renderItem={(repo, _index, handle) => (
              <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-w-0 items-center gap-1 font-mono text-sm font-semibold hover:text-primary hover:underline"
                        title={`Open ${repo.url}`}
                      >
                        <span className="truncate">{repo.name}</span>
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                      </a>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {repo.language ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: langColor(repo.language) }}
                            aria-hidden
                          />
                          {repo.language}
                        </Badge>
                      ) : null}
                      {repo.featured ? (
                        <Badge variant="outline" className="gap-1 px-1.5 text-[10px]">
                          <Star className="size-3" aria-hidden />
                          Featured
                        </Badge>
                      ) : null}
                    </div>
                    {repo.topics?.trim() ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {repo.topics
                          .split(",")
                          .map((t) => t.trim().toLowerCase())
                          .filter(Boolean)
                          .map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                            >
                              #{t}
                            </Badge>
                          ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {handle}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-8 ${
                        repo.featured
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                      onClick={() => toggleFeatured.mutate(repo)}
                      disabled={toggleFeatured.isPending}
                      aria-label={
                        repo.featured ? `Unfeature ${repo.name}` : `Feature ${repo.name}`
                      }
                      title={repo.featured ? "Unfeature" : "Feature"}
                    >
                      <Star className={`size-4 ${repo.featured ? "fill-current" : ""}`} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      onClick={() => openEdit(repo)}
                      aria-label={`Edit ${repo.name}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <ConfirmDeleteDialog
                      title={`Delete “${repo.name}”?`}
                      description="This removes the repo from the site. A later sync can add it back. This action cannot be undone."
                      onConfirm={() => remove.mutate(repo.id)}
                    />
                  </div>
                </div>
                {repo.description ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {repo.description}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5" aria-hidden />
                    <span className="tabular-nums">{repo.stars}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="size-3.5" aria-hidden />
                    <span className="tabular-nums">{repo.forks}</span>
                  </span>
                </div>
              </div>
            )}
          />
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit repo" : "Add repo"}</DialogTitle>
            <DialogDescription>
              Showcased projects on the repositories section. Metadata can be pulled
              straight from GitHub.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="URL" htmlFor="repo-url">
              <div className="flex items-center gap-2">
                <Input
                  id="repo-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/you/awesome-project"
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={pullFromGithub}
                  disabled={pulling}
                  title="Pull name, description, language, topics, stars & forks from GitHub"
                >
                  {pulling ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <CloudDownload className="size-4" aria-hidden />
                  )}
                  Pull
                </Button>
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="Name" htmlFor="repo-name" error={error && !name.trim() ? error : undefined}>
                <Input
                  id="repo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="awesome-project"
                  className="font-mono"
                />
              </Field>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3 sm:mt-0">
                <Switch
                  id="repo-featured"
                  checked={featured}
                  onCheckedChange={setFeatured}
                  aria-label="Featured"
                />
                <Label htmlFor="repo-featured" className="cursor-pointer font-normal">
                  Featured
                </Label>
              </div>
            </div>
            <Field label="Description" htmlFor="repo-description">
              <Textarea
                id="repo-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What it does and why it matters…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Language" htmlFor="repo-language">
                <Input
                  id="repo-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Go"
                />
              </Field>
              <Field label="Stars" htmlFor="repo-stars">
                <Input
                  id="repo-stars"
                  type="number"
                  min={0}
                  value={stars}
                  onChange={(e) => setStars(Number(e.target.value))}
                />
              </Field>
              <Field label="Forks" htmlFor="repo-forks">
                <Input
                  id="repo-forks"
                  type="number"
                  min={0}
                  value={forks}
                  onChange={(e) => setForks(Number(e.target.value))}
                />
              </Field>
            </div>
            <Field
              label="Topics"
              htmlFor="repo-topics"
              hint="Comma-separated tags shown on the card, e.g. react, ai, cli"
            >
              <Input
                id="repo-topics"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="react, ai, cli"
              />
            </Field>
            {error && url.trim() && !url.trim().startsWith("https://") ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Add repo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
