"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
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
  const [order, setOrder] = useState(0);
  const [error, setError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setCompany("");
    setRole("");
    setPeriod("");
    setDescription("");
    setTech("");
    setCurrent(false);
    setOrder(data?.items.length ? Math.max(...data.items.map((x) => x.order)) + 1 : 0);
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
    setOrder(item.order);
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
  const allItems = data?.items ?? [];
  const needle = search.trim().toLowerCase();
  const items = needle
    ? allItems.filter(
        (x) =>
          x.company.toLowerCase().includes(needle) ||
          x.role.toLowerCase().includes(needle) ||
          x.period.toLowerCase().includes(needle) ||
          (x.tech ?? "").toLowerCase().includes(needle)
      )
    : allItems;
  const visibleIds = items.map((x) => x.id);
  const { persist } = usePersistedReorder("experiences", ["admin", "experiences"]);
  const onMove = (visibleIndex: number, dir: -1 | 1) => {
    const next = moveInList(allItems, visibleIds, visibleIndex, dir);
    const it = items[visibleIndex];
    if (next && it) persist(next, `${it.role} @ ${it.company}`, dir);
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
      order: Math.round(order || 0),
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
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">
                    {item.role} <span className="text-muted-foreground">@</span> {item.company}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.period}</span>
                    {item.current ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>
                        Current role
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">order {item.order}</span>
                  </div>
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
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit experience" : "Add experience"}</DialogTitle>
            <DialogDescription>
              Positions appear on the career timeline, ordered by the order field.
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <Field label="Order" htmlFor="exp-order" hint="Lower numbers appear first.">
                <Input
                  id="exp-order"
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
