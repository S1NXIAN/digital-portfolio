"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronsDown } from "lucide-react";

/** Rows rendered before "Show more" appears. Generous, but bounded. */
const PAGE = 60;

/**
 * Progressive reveal for admin lists — keeps 100+ item collections snappy by
 * rendering a bounded slice while search/filter/sort keep operating on the
 * full set.
 */
export function useProgressiveReveal<T>(items: T[]) {
  const [shown, setShown] = useState(PAGE);
  const total = items.length;
  const visibleCount = Math.min(shown, total);
  const isTruncated = total > visibleCount;
  return {
    visible: items.slice(0, visibleCount),
    isTruncated,
    hiddenCount: total - visibleCount,
    showAll: () => setShown(total),
    showMore: () => setShown((n) => n + PAGE),
  };
}

/** "Show more" footer button for a truncated list. */
export function ShowMoreButton({
  hiddenCount,
  onShowMore,
  onShowAll,
}: {
  hiddenCount: number;
  onShowMore: () => void;
  onShowAll: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      <Button variant="outline" size="sm" onClick={onShowMore} className="gap-1.5">
        <ChevronsDown className="size-4" aria-hidden />
        Show more ({hiddenCount})
      </Button>
      <Button variant="ghost" size="sm" onClick={onShowAll} className="text-muted-foreground">
        Show all
      </Button>
    </div>
  );
}
