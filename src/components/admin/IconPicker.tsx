"use client";

import { useEffect, useRef, useState } from "react";
import { Images, Loader2, Search } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface IconResult {
  name: string;
  source: "dashboard" | "simple";
  slug: string;
  url: string;
  hex?: string;
}

interface IconPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the full CDN URL of the picked icon */
  onSelect: (url: string) => void;
  /** Pre-filled search, e.g. the skill name */
  initialQuery?: string;
}

/**
 * Visual icon browser over GET /api/icons/search (Dashboard Icons + Simple Icons).
 * Selecting an icon returns its direct CDN URL — stored as a custom icon URL.
 */
export default function IconPicker({
  open,
  onOpenChange,
  onSelect,
  initialQuery = "",
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IconResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery.trim());
    setPicked(null);
    setResults([]);
    setTotal(0);
    setError("");
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        if (id === reqId.current) {
          setResults([]);
          setTotal(0);
          setError("");
          setLoading(false);
        }
        return;
      }
      if (id === reqId.current) setLoading(true);
      try {
        const res = await fetch(
          `/api/icons/search?q=${encodeURIComponent(q)}&limit=36`
        );
        const json = (await res.json()) as {
          items?: IconResult[];
          total?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Icon search failed");
        if (id === reqId.current) {
          setResults(json.items ?? []);
          setTotal(json.total ?? 0);
          setError("");
        }
      } catch (err) {
        if (id === reqId.current) {
          setError((err as Error).message);
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const pick = (item: IconResult) => {
    setPicked(item.url);
    onSelect(item.url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="size-4 text-primary" aria-hidden />
            Browse icons
          </DialogTitle>
          <DialogDescription>
            Search 5,000+ icons from Dashboard Icons &amp; Simple Icons — the
            same sources dashboardicons.com uses.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. react, kubernetes, prisma…"
            className="pl-9"
            aria-label="Search icons"
          />
        </div>

        <ScrollArea className="h-72 rounded-lg border border-border/60 bg-background/40">
          <div className="p-3">
            {error ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {error}
              </p>
            ) : loading ? (
              <div
                className="grid grid-cols-4 gap-2 sm:grid-cols-6"
                aria-busy="true"
              >
                {Array.from({ length: 18 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-[76px] animate-pulse flex-col items-center justify-center gap-2 rounded-lg bg-muted/60"
                  />
                ))}
              </div>
            ) : query.trim().length < 2 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : results.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No icons found for “{query.trim()}”.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {results.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => pick(item)}
                    title={`${item.name} · ${item.source === "dashboard" ? "Dashboard Icons" : "Simple Icons"}`}
                    className={`flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-lg border p-2 transition-colors hover:border-primary/50 hover:bg-accent/50 ${
                      picked === item.url
                        ? "border-primary bg-accent/60"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-7 object-contain"
                    />
                    <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <Badge variant="secondary" className="font-normal">
            {loading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                searching…
              </span>
            ) : total > 0 ? (
              `${total} match${total === 1 ? "" : "es"}`
            ) : (
              "dashboardicons.com sources"
            )}
          </Badge>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
