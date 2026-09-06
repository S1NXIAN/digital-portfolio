"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import type { SkillData } from "@/types/portfolio";
import { isCustomIconUrl } from "@/lib/stack-icons";
import StackIcon from "@/components/StackIcon";
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
import { Slider } from "@/components/ui/slider";
import { api } from "./lib";
import { ConfirmDeleteDialog, EmptyState, Field, ManagerError, ManagerLoading } from "./ManagerStates";
import IconPicker from "./IconPicker";

const CATEGORIES = ["Languages", "Frontend", "Backend", "DevOps & Cloud", "Tools"];

export default function SkillsManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ items: SkillData[] }>({
    queryKey: ["admin", "skills"],
    queryFn: () => api<{ items: SkillData[] }>("/api/admin/skills"),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SkillData | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Languages");
  const [level, setLevel] = useState(80);
  const [order, setOrder] = useState(0);
  const [icon, setIcon] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setName("");
    setCategory("Languages");
    setLevel(80);
    setOrder(data?.items.length ? Math.max(...data.items.map((s) => s.order)) + 1 : 0);
    setIcon("");
    setError("");
    setOpen(true);
  };

  const openEdit = (skill: SkillData) => {
    setEditing(skill);
    setName(skill.name);
    setCategory(skill.category);
    setLevel(skill.level);
    setOrder(skill.order);
    setIcon(skill.icon ?? "");
    setError("");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      editing
        ? api(`/api/admin/skills/${editing.id}`, { method: "PUT", body: payload })
        : api("/api/admin/skills", { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success(editing ? "Skill updated" : "Skill added");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/skills/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Skill deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Skill name is required");
      return;
    }
    if (!category.trim()) {
      setError("Category is required");
      return;
    }
    setError("");
    save.mutate({
      name: name.trim(),
      category: category.trim(),
      level: Math.round(level),
      order: Math.round(order || 0),
      icon: icon.trim(),
    });
  };

  if (isLoading) return <ManagerLoading />;
  if (isError)
    return (
      <ManagerError
        message="Could not load skills."
        onRetry={() => refetch()}
      />
    );

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} skill{items.length === 1 ? "" : "s"} — powers the stack
          marquee and the Skills section.
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" aria-hidden />
          Add skill
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No skills yet. Add your first skill to get started." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((skill) => (
            <div
              key={skill.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <StackIcon
                    name={skill.name}
                    icon={skill.icon}
                    className="size-6 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{skill.name}</h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary">{skill.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {skill.level}% · order {skill.order}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => openEdit(skill)}
                    aria-label={`Edit ${skill.name}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <ConfirmDeleteDialog
                    title={`Delete “${skill.name}”?`}
                    description="This removes the skill from the site. This action cannot be undone."
                    onConfirm={() => remove.mutate(skill.id)}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, skill.level))}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {skill.level}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit skill" : "Add skill"}</DialogTitle>
            <DialogDescription>
              Skills power the stack marquee and the animated bars in the Skills
              section.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <Field label="Name" htmlFor="skill-name" error={error && !name.trim() ? error : undefined}>
                <Input
                  id="skill-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="TypeScript"
                  autoFocus
                  aria-invalid={Boolean(error && !name.trim())}
                />
              </Field>
              <div className="flex flex-col items-center gap-1 pb-1">
                <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted/40">
                  <StackIcon
                    name={name || "Icon"}
                    icon={icon}
                    className="size-6"
                    title="Icon preview"
                  />
                </div>
                <span className="text-[10px] leading-none text-muted-foreground">
                  preview
                </span>
              </div>
            </div>
            <Field
              label="Category"
              htmlFor="skill-category"
              error={error && name.trim() && !category.trim() ? error : undefined}
            >
              <Input
                id="skill-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="skill-categories"
                placeholder="Backend"
              />
              <datalist id="skill-categories">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Icon"
              htmlFor="skill-icon"
              hint={
                icon.trim() === ""
                  ? "Empty = auto-match from the name (dashboardicons.com → simpleicons.org)."
                  : isCustomIconUrl(icon)
                    ? "Custom icon URL — used as-is."
                    : "dashboardicons.com slug."
              }
            >
              <div className="flex items-center gap-2">
                <Input
                  id="skill-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="typescript · or paste any image URL"
                  className="min-w-0 flex-1"
                  spellCheck={false}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setPickerOpen(true)}
                >
                  <ImagePlus className="size-4" aria-hidden />
                  Browse
                </Button>
                {icon !== "" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground"
                    onClick={() => setIcon("")}
                    aria-label="Clear icon (back to auto-match)"
                    title="Clear icon (back to auto-match)"
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="skill-level">Level</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {Math.round(level)}%
                </Badge>
              </div>
              <Slider
                id="skill-level"
                min={0}
                max={100}
                step={1}
                value={[level]}
                onValueChange={(v) => setLevel(v[0] ?? 0)}
              />
            </div>
            <Field label="Order" htmlFor="skill-order" hint="Lower numbers appear first.">
              <Input
                id="skill-order"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </Field>
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
                  "Add skill"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <IconPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => setIcon(url)}
        initialQuery={name}
      />
    </div>
  );
}
