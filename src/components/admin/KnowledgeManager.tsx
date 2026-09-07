"use client";

import { useMemo, useState, type FormEvent } from "react";
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
  ListCollapse,
  Loader2,
  Network,
  Pencil,
  Plus,
  Rocket,
  SearchX,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "./lib";
import DragList from "./DragList";
import { ShowMoreButton, useProgressiveReveal } from "./progressive-reveal";
import { LIMITS } from "@/lib/limits";
import {
  CategorySelect,
  ConfirmDeleteDialog,
  EmptyState,
  Field,
  ManagerError,
  ManagerLoading,
  ManagerToolbar,
} from "./ManagerStates";
import { usePersistedReorder } from "./use-reorder";

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
const NEW_CATEGORY = "__new__";

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
  const [error, setError] = useState("");

  // List controls — search + category filter.
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const allItems = useMemo(() => data?.items ?? [], [data]);
  const categories = useMemo(
    () =>
      Array.from(new Set(allItems.map((k) => k.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allItems]
  );

  const needle = search.trim().toLowerCase();
  const items = useMemo(
    () =>
      allItems.filter((k) => {
        if (categoryFilter && k.category !== categoryFilter) return false;
        if (!needle) return true;
        return (
          k.title.toLowerCase().includes(needle) ||
          (k.description ?? "").toLowerCase().includes(needle) ||
          k.category.toLowerCase().includes(needle)
        );
      }),
    [allItems, categoryFilter, needle]
  );
  const filtering = needle.length > 0 || categoryFilter !== "";
  const reveal = useProgressiveReveal(items);

  const { persist } = usePersistedReorder("knowledge", ["admin", "knowledge"]);
  const onReorder = (next: KnowledgeData[]) => void persist(next, "Order updated");
  const onKeyboardMove = (visibleIndex: number, dir: -1 | 1) => {
    const next = [...items];
    const target = visibleIndex + dir;
    if (target < 0 || target >= next.length) return;
    [next[visibleIndex], next[target]] = [next[target], next[visibleIndex]];
    onReorder(next);
  };

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setCategory(categoryFilter || "");
    setIcon("Sparkles");
    setError("");
    setOpen(true);
  };

  const openEdit = (item: KnowledgeData) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setCategory(item.category);
    setIcon(KNOWLEDGE_ICONS[item.icon] ? item.icon : "Sparkles");
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
        leading={
          <CategorySelect
            categories={categories}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        }
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
              : `No cards match “${search || categoryFilter}”.`
          }
        />
      ) : (
        <>
          {filtering ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <SearchX className="size-3.5 shrink-0" aria-hidden />
              Drag is paused while filtering — clear the search & category to re-order.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Drag the handle to choose the order the cards appear in.
            </p>
          )}

          <DragList
            items={reveal.visible}
            onReorder={onReorder}
            onKeyboardMove={onKeyboardMove}
            disabled={filtering || reveal.isTruncated}
            className="space-y-3"
            renderItem={(item, _index, handle) => {
              const IconComp = KNOWLEDGE_ICONS[item.icon] ?? Sparkles;
              return (
                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <IconComp className="size-4.5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.category}</Badge>
                      <span className="text-xs text-muted-foreground">icon: {item.icon}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {handle}
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
              );
            }}
          />

          {reveal.isTruncated ? (
            <>
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <ListCollapse className="size-3.5 shrink-0" aria-hidden />
                Drag is paused while the list is collapsed — use “Show all” to re-order.
              </p>
              <ShowMoreButton
                hiddenCount={reveal.hiddenCount}
                onShowMore={reveal.showMore}
                onShowAll={reveal.showAll}
              />
            </>
          ) : null}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit knowledge item" : "Add knowledge item"}</DialogTitle>
            <DialogDescription>Small feature cards with an icon and a blurb.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Title" htmlFor="kn-title" error={error && !title.trim() ? error : undefined}>
              <Input
                id="kn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Distributed systems"
                maxLength={LIMITS.knowledgeTitle}
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
                maxLength={LIMITS.knowledgeDescription}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Category"
                htmlFor="kn-category"
                error={error && title.trim() && !category.trim() ? error : undefined}
                hint="Pick an existing category or add a new one."
              >
                {category && !categories.includes(category) ? (
                  // Custom category — editable input with a "back to list" affordance.
                  <div className="flex items-center gap-2">
                    <Input
                      id="kn-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Infrastructure"
                      maxLength={LIMITS.knowledgeCategory}
                      autoFocus={Boolean(editing) && !categories.includes(editing?.category ?? "")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => setCategory(categories[0] ?? "")}
                      disabled={categories.length === 0}
                    >
                      Use existing
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={category || undefined}
                    onValueChange={(v) => setCategory(v === NEW_CATEGORY ? "New category" : v)}
                  >
                    <SelectTrigger id="kn-category" className="w-full">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_CATEGORY} className="text-primary">
                        <span className="flex items-center gap-1.5">
                          <Plus className="size-3.5" aria-hidden />
                          New category…
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
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
            </div>
            {error && title.trim() && !category.trim() ? (
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
