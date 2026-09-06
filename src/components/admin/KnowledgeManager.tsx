"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  Brain,
  CloudCog,
  Code2,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  Loader2,
  Network,
  Pencil,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { KnowledgeData } from "@/types/portfolio";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const KNOWLEDGE_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Network,
  Gauge,
  FlaskConical,
  ShieldCheck,
  CloudCog,
  Terminal,
  Code2,
  Database,
  Cpu,
  Layers,
  Rocket,
  Wrench,
  BookOpen,
  Brain,
  GitBranch,
};

const ICON_NAMES = Object.keys(KNOWLEDGE_ICONS);

export default function KnowledgeManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ items: KnowledgeData[] }>({
    queryKey: ["admin", "knowledge"],
    queryFn: () => api<{ items: KnowledgeData[] }>("/api/admin/knowledge"),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeData | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [order, setOrder] = useState(0);
  const [error, setError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setIcon("Sparkles");
    setOrder(data?.items.length ? Math.max(...data.items.map((k) => k.order)) + 1 : 0);
    setError("");
    setOpen(true);
  };

  const openEdit = (item: KnowledgeData) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setCategory(item.category);
    setIcon(KNOWLEDGE_ICONS[item.icon] ? item.icon : "Sparkles");
    setOrder(item.order);
    setError("");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      editing
        ? api(`/api/admin/knowledge/${editing.id}`, { method: "PUT", body: payload })
        : api("/api/admin/knowledge", { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success(editing ? "Knowledge item updated" : "Knowledge item added");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/knowledge/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Knowledge item deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [search, setSearch] = useState("");
  const allItems = data?.items ?? [];
  const needle = search.trim().toLowerCase();
  const items = needle
    ? allItems.filter(
        (k) =>
          k.title.toLowerCase().includes(needle) ||
          (k.description ?? "").toLowerCase().includes(needle) ||
          k.category.toLowerCase().includes(needle)
      )
    : allItems;
  const visibleIds = items.map((k) => k.id);
  const { persist } = usePersistedReorder("knowledge", ["admin", "knowledge"]);
  const onMove = (visibleIndex: number, dir: -1 | 1) => {
    const next = moveInList(allItems, visibleIds, visibleIndex, dir);
    if (next) persist(next, items[visibleIndex]?.title, dir);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!category.trim()) {
      setError("Category is required");
      return;
    }
    setError("");
    save.mutate({
      title: title.trim(),
      description,
      category: category.trim(),
      icon,
      order: Math.round(order || 0),
    });
  };

  if (isLoading) return <ManagerLoading />;
  if (isError)
    return <ManagerError message="Could not load knowledge items." onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <ManagerToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search knowledge cards…"
        count={items.length}
        totalCount={allItems.length}
      >
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" aria-hidden />
          Add knowledge item
        </Button>
      </ManagerToolbar>

      {items.length === 0 ? (
        <EmptyState
          message={
            allItems.length === 0
              ? "No knowledge items yet. Add your first card."
              : `No cards match “${search}”.`
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => {
            const IconComp = KNOWLEDGE_ICONS[item.icon] ?? Sparkles;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <IconComp className="size-4.5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold">{item.title}</h3>
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
                        onClick={() => openEdit(item)}
                        aria-label={`Edit ${item.title}`}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <ConfirmDeleteDialog
                        title={`Delete “${item.title}”?`}
                        description="This removes the card from the site. This action cannot be undone."
                        onConfirm={() => remove.mutate(item.id)}
                      />
                    </div>
                  </div>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      icon: {item.icon} · order {item.order}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit knowledge item" : "Add knowledge item"}</DialogTitle>
            <DialogDescription>Small feature cards with an icon and a blurb.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Title" htmlFor="kn-title">
              <Input
                id="kn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Distributed systems"
                autoFocus
              />
            </Field>
            <Field label="Description" htmlFor="kn-description">
              <Textarea
                id="kn-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A one-liner about this area of expertise…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="kn-category">
                <Input
                  id="kn-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Infrastructure"
                />
              </Field>
              <Field label="Order" htmlFor="kn-order" hint="Lower numbers appear first.">
                <Input
                  id="kn-order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Icon" htmlFor="kn-icon">
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger id="kn-icon" className="w-full">
                  <SelectValue placeholder="Choose an icon" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_NAMES.map((name) => {
                    const IconComp = KNOWLEDGE_ICONS[name];
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <IconComp className="size-4" aria-hidden />
                          {name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
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
                  "Add item"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
