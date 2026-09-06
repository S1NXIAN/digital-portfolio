"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Loader2, ZoomIn } from "lucide-react";
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
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
/** Crop-guide circle diameter, as a fraction of the viewport. */
const GUIDE_RATIO = 0.78;

/** Camera state: zoom multiplier (over cover-fit) + pan offset in px. */
type Camera = { zoom: number; x: number; y: number };

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
 * Drag to reposition, scroll or slider to zoom — the guide circle shows
 * how the crop will be presented on the site. Exports a 512×512 JPEG
 * data URL rendered from a canvas, so the admin controls exactly what
 * is visible instead of relying on an automatic center crop.
 */
export default function PhotoCropper({ src, open, onApply, onClose }: PhotoCropperProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [vpSize, setVpSize] = useState(0);
  const [load, setLoad] = useState<{
    src: string | null;
    img: HTMLImageElement | null;
    status: "loading" | "ready" | "error";
  }>({ src: null, img: null, status: "loading" });
  const [cam, setCam] = useState<Camera>({ zoom: 1, x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; cam: Camera } | null>(
    null
  );

  // "loading" is derived: anything newer than the last completed load.
  const imgState: "loading" | "ready" | "error" =
    src === null ? "loading" : load.src === src ? load.status : "loading";
  const img = load.src === src ? load.img : null;

  // Kick off the image decode whenever a new source comes in. State only
  // updates from the async callbacks — never synchronously in the effect.
  useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setLoad({ src, img: image, status: "ready" });
      setCam({ zoom: 1, x: 0, y: 0 }); // fresh framing for the new source
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

  // Track the viewport's rendered size (it is responsive).
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setVpSize(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, imgState]);

  /** Cover-fit scale of the source image into the viewport at zoom 1. */
  const baseScale = useMemo(() => {
    if (!img || vpSize === 0) return 1;
    return Math.max(vpSize / img.naturalWidth, vpSize / img.naturalHeight);
  }, [img, vpSize]);

  const clampCam = useCallback(
    (next: Camera): Camera => {
      if (!img || vpSize === 0) return { zoom: MIN_ZOOM, x: 0, y: 0 };
      const scale = baseScale * next.zoom;
      const halfW = (img.naturalWidth * scale - vpSize) / 2;
      const halfH = (img.naturalHeight * scale - vpSize) / 2;
      return {
        zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom)),
        x: halfW > 0 ? Math.min(halfW, Math.max(-halfW, next.x)) : 0,
        y: halfH > 0 ? Math.min(halfH, Math.max(-halfH, next.y)) : 0,
      };
    },
    [img, vpSize, baseScale]
  );

  /** Zoom keeping the point under viewport coords (cx, cy) stationary. */
  const zoomAt = useCallback(
    (prev: Camera, nextZoom: number, cx: number, cy: number): Camera => {
      if (!img || vpSize === 0) return prev;
      const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      const f = target / prev.zoom;
      if (!Number.isFinite(f) || f <= 0) return prev;
      const scaleBefore = baseScale * prev.zoom;
      const wBefore = img.naturalWidth * scaleBefore;
      const hBefore = img.naturalHeight * scaleBefore;
      const zoomAt = (c: number, off: number, size: number) => {
        const topLeft = vpSize / 2 + off - size / 2;
        const newTopLeft = c - (c - topLeft) * f;
        return newTopLeft - vpSize / 2 + (size * f) / 2;
      };
      return clampCam({
        zoom: target,
        x: zoomAt(cx, prev.x, wBefore),
        y: zoomAt(cy, prev.y, hBefore),
      });
    },
    [img, vpSize, baseScale, clampCam]
  );

  // Non-passive wheel handler so page scroll doesn't fight the zoom.
  useEffect(() => {
    const el = viewportRef.current;
    if (!open || imgState !== "ready" || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setCam((prev) => zoomAt(prev, prev.zoom * factor, cx, cy));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, imgState, zoomAt]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (imgState !== "ready") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, cam };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setCam(
      clampCam({
        ...drag.cam,
        x: drag.cam.x + (e.clientX - drag.startX),
        y: drag.cam.y + (e.clientY - drag.startY),
      })
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (imgState !== "ready") return;
    const step = e.shiftKey ? 40 : 10;
    const map: Record<string, () => Camera> = {
      ArrowLeft: () => ({ ...cam, x: cam.x - step }),
      ArrowRight: () => ({ ...cam, x: cam.x + step }),
      ArrowUp: () => ({ ...cam, y: cam.y - step }),
      ArrowDown: () => ({ ...cam, y: cam.y + step }),
      "=": () => zoomAt(cam, cam.zoom * 1.1, vpSize / 2, vpSize / 2),
      "+": () => zoomAt(cam, cam.zoom * 1.1, vpSize / 2, vpSize / 2),
      "-": () => zoomAt(cam, cam.zoom / 1.1, vpSize / 2, vpSize / 2),
    };
    const action = map[e.key];
    if (!action) return;
    e.preventDefault();
    setCam(clampCam(action()));
  };

  /** Render the exact viewport region to a 512×512 JPEG data URL. */
  const applyCrop = () => {
    if (!img || vpSize === 0) return;
    const scale = baseScale * cam.zoom;
    const renderedW = img.naturalWidth * scale;
    const renderedH = img.naturalHeight * scale;
    const topLeftX = vpSize / 2 + cam.x - renderedW / 2;
    const topLeftY = vpSize / 2 + cam.y - renderedH / 2;
    const sx = -topLeftX / scale;
    const sy = -topLeftY / scale;
    const sSize = vpSize / scale;
    if (sSize <= 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff"; // flatten transparency for JPEG
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onApply(canvas.toDataURL("image/jpeg", 0.85));
  };

  const renderedW = img ? img.naturalWidth * baseScale * cam.zoom : 0;
  const renderedH = img ? img.naturalHeight * baseScale * cam.zoom : 0;
  const topLeftX = vpSize / 2 + cam.x - renderedW / 2;
  const topLeftY = vpSize / 2 + cam.y - renderedH / 2;

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
            Drag to reposition, scroll or use the slider to zoom. The circle shows how the photo
            will be presented — you control exactly what is in frame.
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
              className="relative mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none select-none overflow-hidden rounded-xl border border-border bg-muted active:cursor-grabbing"
              tabIndex={0}
              role="application"
              aria-label="Photo crop area — drag to pan, arrow keys to nudge, plus and minus to zoom"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              {imgState === "loading" ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : null}
              {img && imgState === "ready" ? (
                <img
                  src={src ?? undefined}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{
                    width: `${renderedW}px`,
                    height: `${renderedH}px`,
                    left: `${topLeftX}px`,
                    top: `${topLeftY}px`,
                  }}
                />
              ) : null}
              {/* Circular crop guide */}
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-white/80"
                  style={{ width: `${GUIDE_RATIO * 100}%`, height: `${GUIDE_RATIO * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Slider
                value={[cam.zoom]}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                onValueChange={([z]) => setCam((prev) => zoomAt(prev, z, vpSize / 2, vpSize / 2))}
                disabled={imgState !== "ready"}
                aria-label="Zoom"
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={applyCrop} disabled={imgState !== "ready"}>
            Apply crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
