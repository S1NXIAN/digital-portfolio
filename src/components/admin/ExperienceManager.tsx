"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, Loader2, Pencil, Plus, SearchX } from "lucide-react";
import type { ExperienceData } from "@/types/portfolio";
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

export default function ExperienceManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ items: ExperienceData[] }>({
    queryKey: ["admin", "experiences"],
    queryFn: () => api<{ items: ExperienceData[] }>("/api/admin/experiences"),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExperienceData | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [tech, setTech] = useState("");
  const [current, setCurrent] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setCompany("");
    setRole("");
    setPeriod("");
    setDescription("");
    setTech("");
    setCurrent(false);
    setError("");
    setOpen(true);
  };

  const openEdit = (item: ExperienceData) => {
    setEditing(item);
    setCompany(item.company);
    setRole(item.role);
    setPeriod(item.period);
    setDescription(item.description ?? "");
    setTech(item.tech ?? "");
    setCurrent(item.current);
    setError("");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      editing
        ? api(`/api/admin/experiences/${editing.id}`, { method: "PUT", body: payload })
        : api("/api/admin/experiences", { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "experiences"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success(editing ? "Experience updated" : "Experience added");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/experiences/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "experiences"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Experience deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [search, setSearch] = useState("");
  const allItems = useMemo(() => data?.items ?? [], [data]);
  const needle = search.trim().toLowerCase();
  const items = useMemo(
    () =>
      needle
        ? allItems.filter(
            (x) =>
              x.company.toLowerCase().includes(needle) ||
              x.role.toLowerCase().includes(needle) ||
              x.period.toLowerCase().includes(needle) ||
              (x.tech ?? "").toLowerCase().includes(needle)
          )
        : allItems,
    [allItems, needle]
  );
  const filtering = needle.length > 0;

  const { persist } = usePersistedReorder("experiences", ["admin", "experiences"]);
  const onReorder = (next: ExperienceData[]) => void persist(next, "Timeline order updated");
  const onKeyboardMove = (visibleIndex: number, dir: -1 | 1) => {
    const next = [...items];
    const target = visibleIndex + dir;
    if (target < 0 || target >= next.length) return;
    [next[visibleIndex], next[target]] = [next[target], next[visibleIndex]];
    onReorder(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim() || !period.trim()) {
      setError("Company, role and period are required");
      return;
    }
    setError("");
    save.mutate({
      company: company.trim(),
      role: role.trim(),
      period: period.trim(),
      description,
      tech,
      current,
    });
  };

  if (isLoading) return <ManagerLoading />;
  if (isError)
    return <ManagerError message="Could not load experiences." onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <ManagerToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search roles, companies, tech…"
        count={items.length}
        totalCount={allItems.length}
      >
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" aria-hidden />
          Add experience
        </Button>
      </ManagerToolbar>

      {items.length === 0 ? (
        <EmptyState
          message={
            allItems.length === 0
              ? "No experience entries yet. Add your first role."
              : `No positions match “${search}”.`
          }
        />
      ) : (
        <>
          {filtering ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <SearchX className="size-3.5 shrink-0" aria-hidden />
              Drag is paused while searching — clear the search to re-order the timeline.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Drag the handle to set the order — this is exactly how the career timeline flows
              on the site.
            </p>
          )}

          <DragList
            items={items}
            onReorder={onReorder}
            onKeyboardMove={onKeyboardMove}
            disabled={filtering}
            className="space-y-0"
            renderItem={(item, index, handle, isLast) => (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                  {/* Sequence chip — the flow position of this card */}
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold tabular-nums ${
                      item.current
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                    aria-label={`Position ${index + 1}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="text-sm font-semibold">
                        {item.role} <span className="text-muted-foreground">@</span> {item.company}
                      </h3>
                      {item.current ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-primary" />
                          </span>
                          Current role
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.period}</span>
                    </div>
                    {item.description ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    {item.tech?.trim() ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tech
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((t) => (
                            <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px]">
                              {t}
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
                      className="size-8 text-muted-foreground"
                      onClick={() => openEdit(item)}
                      aria-label={`Edit experience at ${item.company}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <ConfirmDeleteDialog
                      title={`Delete “${item.role} @ ${item.company}”?`}
                      description="This removes the position from the timeline. This action cannot be undone."
                      onConfirm={() => remove.mutate(item.id)}
                    />
                  </div>
                </div>

                {/* Flow connector — shows what comes next in the timeline */}
                {!isLast ? (
                  <div className="flex flex-col items-center py-0.5" aria-hidden="true">
                    <span className="h-2.5 w-px bg-border" />
                    <span className="flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                      <ArrowDown className="size-3" />
                    </span>
                    <span className="h-2.5 w-px bg-border" />
                  </div>
                ) : null}
              </>
            )}
          />
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit experience" : "Add experience"}</DialogTitle>
            <DialogDescription>
              Positions appear on the career timeline. Drag the cards in the list to choose
              what comes first.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" htmlFor="exp-company">
                <Input
                  id="exp-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  autoFocus
                />
              </Field>
              <Field label="Role" htmlFor="exp-role">
                <Input
                  id="exp-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Senior Backend Engineer"
                />
              </Field>
            </div>
            <Field label="Period" htmlFor="exp-period">
              <Input
                id="exp-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="2022 — Present"
              />
            </Field>
            <Field label="Description" htmlFor="exp-description">
              <Textarea
                id="exp-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What you built, led or improved…"
              />
            </Field>
            <Field
              label="Tech"
              htmlFor="exp-tech"
              hint="Comma-separated, e.g. Go, PostgreSQL, Kubernetes"
            >
              <Input
                id="exp-tech"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                placeholder="Go, PostgreSQL, Kubernetes"
              />
            </Field>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch
                id="exp-current"
                checked={current}
                onCheckedChange={setCurrent}
                aria-label="Current role"
              />
              <Label htmlFor="exp-current" className="cursor-pointer font-normal">
                Current role
              </Label>
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
                  "Add experience"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
