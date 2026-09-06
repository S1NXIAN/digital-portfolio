"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, GitFork, Loader2, Pencil, Plus, Star } from "lucide-react";
import type { RepoData } from "@/types/portfolio";
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
import {
  ConfirmDeleteDialog,
  EmptyState,
  Field,
  ManagerError,
  ManagerLoading,
  ManagerToolbar,
  ReorderButtons,
} from "./ManagerStates";
import { moveInList, usePersistedReorder } from "./use-reorder";

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
  const [order, setOrder] = useState(0);
  const [error, setError] = useState("");

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
    setOrder(data?.items.length ? Math.max(...data.items.map((r) => r.order)) + 1 : 0);
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
    setOrder(item.order);
    setError("");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      editing
        ? api(`/api/admin/repos/${editing.id}`, { method: "PUT", body: payload })
        : api("/api/admin/repos", { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "repos"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success(editing ? "Repo updated" : "Repo added");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/repos/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "repos"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Repo deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [search, setSearch] = useState("");
  const allItems = data?.items ?? [];
  const needle = search.trim().toLowerCase();
  const items = needle
    ? allItems.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.description ?? "").toLowerCase().includes(needle) ||
          (r.language ?? "").toLowerCase().includes(needle) ||
          (r.topics ?? "").toLowerCase().includes(needle)
      )
    : allItems;
  const visibleIds = items.map((r) => r.id);
  const { persist } = usePersistedReorder("repos", ["admin", "repos"]);
  const onMove = (visibleIndex: number, dir: -1 | 1) => {
    const next = moveInList(allItems, visibleIds, visibleIndex, dir);
    if (next) persist(next, items[visibleIndex]?.name, dir);
  };

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
      order: Math.round(order || 0),
    });
  };

  if (isLoading) return <ManagerLoading />;
  if (isError) return <ManagerError message="Could not load repos." onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
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
              ? "No repos yet. Add your first repository."
              : `No repos match “${search}”.`
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((repo, index) => (
            <div
              key={repo.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
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
                    {repo.language ? <Badge variant="secondary">{repo.language}</Badge> : null}
                    {repo.featured ? (
                      <Badge variant="outline" className="gap-1 px-1.5 text-[10px]">
                        <Star className="size-3" aria-hidden />
                        Featured
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">order {repo.order}</span>
                  </div>
                  {repo.topics?.trim() ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {repo.topics
                        .split(",")
                        .map((t) => t.trim().toLowerCase())
                        .filter(Boolean)
                        .map((t) => (
                          <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                            #{t}
                          </Badge>
                        ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ReorderButtons
                    onMove={onMove}
                    index={index}
                    total={items.length}
                  />
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
                    description="This removes the repo from the site. This action cannot be undone."
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
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit repo" : "Add repo"}</DialogTitle>
            <DialogDescription>
              Showcased projects on the repositories section.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Name" htmlFor="repo-name">
              <Input
                id="repo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="awesome-project"
                className="font-mono"
                autoFocus
              />
            </Field>
            <Field label="Description" htmlFor="repo-description">
              <Textarea
                id="repo-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What it does and why it matters…"
              />
            </Field>
            <Field label="URL" htmlFor="repo-url">
              <Input
                id="repo-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/you/awesome-project"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
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
              <Field label="Order" htmlFor="repo-order" hint="Lower numbers appear first.">
                <Input
                  id="repo-order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </Field>
            </div>
            {error ? (
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
