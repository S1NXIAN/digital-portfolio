"use client";

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./lib";

type AdminEntity = "skills" | "experiences" | "repos" | "knowledge";

/**
 * Compute a new full-list order from a move performed inside a (possibly
 * filtered) visible subset. The item jumps to just before/after its nearest
 * visible neighbour in the FULL list, so hidden items keep a sane order.
 * Returns null when the move is a no-op (edge of the visible list).
 */
export function moveInList<T extends { id: string }>(
  full: T[],
  visibleIds: string[],
  visibleIndex: number,
  dir: -1 | 1
): T[] | null {
  const neighborVisibleIndex = visibleIndex + dir;
  if (neighborVisibleIndex < 0 || neighborVisibleIndex >= visibleIds.length) return null;

  const movedId = visibleIds[visibleIndex];
  const neighborId = visibleIds[neighborVisibleIndex];
  const movedIndex = full.findIndex((x) => x.id === movedId);
  const neighborIndex = full.findIndex((x) => x.id === neighborId);
  if (movedIndex === -1 || neighborIndex === -1) return null;

  const next = full.filter((x) => x.id !== movedId);
  const insertAt = next.findIndex((x) => x.id === neighborId);
  next.splice(dir === -1 ? insertAt : insertAt + 1, 0, full[movedIndex]);
  return next;
}

/**
 * Persist a new item order with an optimistic UI update.
 * Returns the async persist function plus a pending flag.
 */
export function usePersistedReorder(entity: AdminEntity, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const busy = useRef(false);

  const persist = useCallback(
    async (next: unknown[], movedLabel?: string, dir?: -1 | 1) => {
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
        if (movedLabel)
          toast.success(`Moved ${movedLabel} ${dir === -1 ? "up" : "down"}`);
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
