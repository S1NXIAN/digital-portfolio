"use client";

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./lib";
import type { AdminEntity } from "@/types/portfolio";

export type SortDir = "asc" | "desc";

/**
 * Apply an A-Z / Z-A sort to a (possibly filtered) subset of the full list,
 * while every other item keeps its current global position. The subset slides
 * into the same positions it already occupies — cross-category order is
 * preserved, so the public site's category grouping stays sane.
 */
export function sortSubsetInPlace<T extends { id: string }>(
  full: T[],
  visibleIds: string[],
  label: (item: T) => string,
  dir: SortDir
): T[] {
  const subset = new Set(visibleIds);
  const sorted = full
    .filter((x) => subset.has(x.id))
    .sort((a, b) => {
      const cmp = label(a).localeCompare(label(b), undefined, {
        sensitivity: "base",
        numeric: true,
      });
      return dir === "asc" ? cmp : -cmp;
    });
  let k = 0;
  return full.map((x) => (subset.has(x.id) ? sorted[k++] : x));
}

/**
 * Persist a new item order (drag & drop result or alphabetical sort) with an
 * optimistic UI update. Pass ids in the desired final order; the API assigns
 * order = array index.
 */
export function usePersistedReorder(entity: AdminEntity, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const busy = useRef(false);

  const persist = useCallback(
    async (next: unknown[], toastMessage?: string) => {
      if (busy.current) return;
      busy.current = true;

      queryClient.setQueryData<{ items: unknown[] }>(queryKey, (old) =>
        old ? { ...old, items: next } : old
      );

      try {
        await api(`/api/admin/${entity}/reorder`, {
          method: "PATCH",
          body: { ids: (next as { id: string }[]).map((x) => x.id) },
        });
        await queryClient.invalidateQueries({ queryKey });
        await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
        toast.success(toastMessage ?? "Order updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Reorder failed");
        await queryClient.invalidateQueries({ queryKey });
      } finally {
        busy.current = false;
      }
    },
    [queryClient, entity, queryKey]
  );

  return { persist, isReordering: busy };
}
