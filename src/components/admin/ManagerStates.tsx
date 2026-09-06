"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Three skeleton cards shown while an entity list is loading. */
export function ManagerLoading({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-5 h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Muted error state with a retry button. */
export function ManagerError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
      <p className="text-sm text-muted-foreground">
        {message ?? "Something went wrong while loading this section."}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/** Label + control + inline error/hint wrapper for consistent form spacing. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Trash icon button wrapped in a confirm dialog. */
export function ConfirmDeleteDialog({
  title = "Delete this item?",
  description = "This action cannot be undone.",
  onConfirm,
}: {
  title?: string;
  description?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Empty-list placeholder card. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

/** Search + count header with a right-hand slot (usually the Add button). */
export function ManagerToolbar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  count,
  totalCount,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  count: number;
  totalCount: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label={searchPlaceholder}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {count === totalCount ? `${totalCount} item${totalCount === 1 ? "" : "s"}` : `${count} / ${totalCount}`}
      </span>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}

/** Up/down reorder arrows; wire to a move handler that persists the new order. */
export function ReorderButtons({
  onMove,
  index,
  total,
  disabled,
}: {
  onMove: (index: number, dir: -1 | 1) => void;
  index: number;
  total: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center" role="group" aria-label="Reorder">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground disabled:opacity-25"
        onClick={() => onMove(index, -1)}
        disabled={disabled || index === 0}
        aria-label="Move up"
      >
        <ChevronUp className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground disabled:opacity-25"
        onClick={() => onMove(index, 1)}
        disabled={disabled || index === total - 1}
        aria-label="Move down"
      >
        <ChevronDown className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
