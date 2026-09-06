"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const OUTPUT_SIZE = 512; // exported square size (matches the site's expectations)
/** Circle can shrink to 10% of the image's smaller side, but never below 8px. */
const MIN_RADIUS_FRACTION = 0.1;
const MIN_RADIUS_PX = 8;

/** Crop selection, in SOURCE IMAGE pixel coordinates (resolution-independent). */
type Selection = { cx: number; cy: number; r: number };

interface PhotoCropperProps {
  /** Image to crop — a data URL or a same-origin path. */
  src: string | null;
  open: boolean;
  onApply: (dataUrl: string) => void;
  onClose: () => void;
}

/**
 * Native (dependency-free) photo cropper for the admin profile.
 *
 * The photo is shown contain-fit (always fully visible) with a movable,
 * resizable circular selection on top: drag the circle to position it,
 * drag its corner handle / scroll / use the slider to resize it — up
 * until it touches the photo's edges. Exports a 512×512 JPEG data URL
 * rendered from a canvas, so the admin controls exactly what is in frame.
 */
export default function PhotoCropper({ src, open, onApply, onClose }: PhotoCropperProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [vpSize, setVpSize] = useState(0);
  const [load, setLoad] = useState<{
    src: string | null;
    img: HTMLImageElement | null;
    status: "loading" | "ready" | "error";
  }>({ src: null, img: null, status: "loading" });
  const [sel, setSel] = useState<Selection>({ cx: 0, cy: 0, r: 0 });
  const dragRef = useRef<
    | null
    | {
        pointerId: number;
        mode: "move" | "resize";
        rect: DOMRect;
        startX: number;
        startY: number;
        start: Selection;
      }
  >(null);

  // "loading" is derived: anything newer than the last completed load.
  const imgState: "loading" | "ready" | "error" =
    src === null ? "loading" : load.src === src ? load.status : "loading";
  const img = load.src === src ? load.img : null;
  const ready = imgState === "ready" && !!img && img.naturalWidth > 0;

  // Kick off the image decode whenever a new source comes in. State only
  // updates from the async callbacks — never synchronously in the effect.
  useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setLoad({ src, img: image, status: "ready" });
      // Fresh framing: the largest centered circle that fits the photo.
      const half = Math.min(image.naturalWidth, image.naturalHeight) / 2;
      setSel({
        cx: image.naturalWidth / 2,
        cy: image.naturalHeight / 2,
        r: half,
      });
    };
    image.onerror = () => {
      if (cancelled) return;
      setLoad({ src, img: null, status: "error" });
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [open, src]);

  // Track the viewport's rendered size (it is responsive). offsetWidth is
  // used deliberately: getBoundingClientRect is polluted by the dialog's
  // entrance transform (scale .95 → 1), and a transform never fires the
  // ResizeObserver — which once locked the cropper to a stale 304px box.
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setVpSize(el.offsetWidth || Math.round(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, imgState]);

  /** Contain-fit scale: the whole photo is always visible. */
  const containScale = useMemo(() => {
    if (!ready || vpSize === 0) return 1;
    return Math.min(vpSize / img.naturalWidth, vpSize / img.naturalHeight);
  }, [ready, img, vpSize]);

  const display = useMemo(() => {
    if (!ready || vpSize === 0) return { w: 0, h: 0, x: 0, y: 0 };
    const w = img.naturalWidth * containScale;
    const h = img.naturalHeight * containScale;
    return { w, h, x: (vpSize - w) / 2, y: (vpSize - h) / 2 };
  }, [ready, img, containScale, vpSize]);

  const clampSel = useCallback(
    (next: Selection): Selection => {
      if (!ready) return next;
      const { naturalWidth: iw, naturalHeight: ih } = img;
      // The circle must always sit fully inside the photo — r capped by the
      // distance to each wall, then the center capped by that radius.
      const rMin = Math.max(MIN_RADIUS_PX, Math.min(iw, ih) * MIN_RADIUS_FRACTION);
      const r = Math.min(Math.max(next.r, rMin), Math.min(iw, ih) / 2);
      return {
        r,
        cx: Math.min(Math.max(next.cx, r), iw - r),
        cy: Math.min(Math.max(next.cy, r), ih - r),
      };
    },
    [ready, img]
  );

  // Non-passive wheel handler: scrolling over the crop resizes the circle.
  useEffect(() => {
    const el = viewportRef.current;
    if (!open || !ready || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.06 : 1 / 1.06;
      setSel((prev) => clampSel({ ...prev, r: prev.r * factor }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, ready, clampSel]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready || dragRef.current) return;
    const mode = (e.target as HTMLElement).closest("[data-crop-handle]") ? "resize" : "move";
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      mode,
      rect: e.currentTarget.getBoundingClientRect(),
      startX: e.clientX,
      startY: e.clientY,
      start: sel,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.mode === "move") {
      const dx = (e.clientX - drag.startX) / containScale;
      const dy = (e.clientY - drag.startY) / containScale;
      setSel(clampSel({ ...drag.start, cx: drag.start.cx + dx, cy: drag.start.cy + dy }));
    } else {
      // Resize: radius follows the handle's distance to the circle center.
      const centerX = drag.rect.left + display.x + drag.start.cx * containScale;
      const centerY = drag.rect.top + display.y + drag.start.cy * containScale;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      setSel(clampSel({ ...drag.start, r: dist / containScale }));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!ready) return;
    const step = (e.shiftKey ? 40 : 10) / containScale;
    const grow = 1.08;
    const map: Record<string, () => Selection> = {
      ArrowLeft: () => ({ ...sel, cx: sel.cx - step }),
      ArrowRight: () => ({ ...sel, cx: sel.cx + step }),
      ArrowUp: () => ({ ...sel, cy: sel.cy - step }),
      ArrowDown: () => ({ ...sel, cy: sel.cy + step }),
      "=": () => ({ ...sel, r: sel.r * grow }),
      "+": () => ({ ...sel, r: sel.r * grow }),
      "-": () => ({ ...sel, r: sel.r / grow }),
    };
    const action = map[e.key];
    if (!action) return;
    e.preventDefault();
    setSel(clampSel(action()));
  };

  /** Render the circle's bounding square from the source to a 512×512 JPEG. */
  const applyCrop = () => {
    if (!ready || sel.r <= 0) return;
    const sSize = sel.r * 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff"; // flatten transparency for JPEG
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, sel.cx - sel.r, sel.cy - sel.r, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onApply(canvas.toDataURL("image/jpeg", 0.85));
  };

  // Screen-space geometry for the circle + handle.
  const d = sel.r * 2 * containScale;
  const left = display.x + (sel.cx - sel.r) * containScale;
  const top = display.y + (sel.cy - sel.r) * containScale;
  const halfMin = ready ? Math.min(img.naturalWidth, img.naturalHeight) / 2 : 1;
  const rMin = ready ? Math.max(MIN_RADIUS_PX, halfMin * MIN_RADIUS_FRACTION) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop photo</DialogTitle>
          <DialogDescription>
            Drag the circle to frame your shot — drag its corner dot, scroll, or use the slider to
            resize it. It can grow until it touches the photo&apos;s edges. Exports a 512×512 JPEG.
          </DialogDescription>
        </DialogHeader>

        {imgState === "error" ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
            <ImageOff className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">That file could not be opened.</p>
          </div>
        ) : (
          <>
            <div
              ref={viewportRef}
              className="relative mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none select-none active:cursor-grabbing"
              tabIndex={0}
              role="application"
              aria-label="Photo crop area — drag the circle to move it, arrow keys to nudge, plus and minus to resize"
              data-lenis-prevent
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              {/* Clip layer — the photo and the dim-out must not bleed past
                  the frame, but the resize handle lives OUTSIDE this layer so
                  its 44px hit area stays draggable at the walls. */}
              <div className="absolute inset-0 overflow-hidden rounded-xl border border-border bg-muted">
                {imgState === "loading" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
                  </div>
                ) : null}
                {ready ? (
                  <img
                    src={src ?? undefined}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute max-w-none"
                    style={{
                      width: `${display.w}px`,
                      height: `${display.h}px`,
                      left: `${display.x}px`,
                      top: `${display.y}px`,
                    }}
                  />
                ) : null}
                {/* Circular crop selection — dims everything outside it */}
                {ready ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-white/80"
                    style={{ left: `${left}px`, top: `${top}px`, width: `${d}px`, height: `${d}px` }}
                    aria-hidden
                  />
                ) : null}
              </div>
              {/* Resize handle — unclipped, 44px hit area, visual dot on top */}
              {ready ? (
                <div
                  data-crop-handle
                  className="absolute z-20 flex size-11 cursor-nwse-resize touch-none items-center justify-center rounded-full"
                  style={{ left: `${left + d}px`, top: `${top + d}px`, transform: "translate(-50%, -50%)" }}
                  aria-hidden
                >
                  <span className="size-3.5 rounded-full bg-white shadow-md ring-2 ring-black/30" />
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Maximize2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Slider
                value={[sel.r]}
                min={rMin}
                max={Math.max(halfMin, rMin)}
                step={1}
                onValueChange={([r]) => setSel((prev) => clampSel({ ...prev, r }))}
                disabled={!ready}
                aria-label="Crop size"
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={applyCrop} disabled={!ready}>
            Apply crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
