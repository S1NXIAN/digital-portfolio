"use client";

import { type ReactNode } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

type DragItem = { id: string };

type HandleProps = {
  onPointerDown: (event: React.PointerEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  className: string;
  "aria-label": string;
  "aria-roledescription": string;
  title: string;
};

interface DragListProps<T extends DragItem> {
  items: T[];
  onReorder: (next: T[]) => void;
  /**
   * Render one row. `handle` is a pre-wired grab handle — place it inside the
   * card (top corner is a good spot). `isLast` powers flow connectors.
   */
  renderItem: (item: T, index: number, handle: ReactNode, isLast: boolean) => ReactNode;
  /** Disable dragging (e.g. while a search/filter hides items). */
  disabled?: boolean;
  /** Keyboard reorder (ArrowUp / ArrowDown on the handle). */
  onKeyboardMove?: (index: number, dir: -1 | 1) => void;
  className?: string;
}

/**
 * Dependency-free-feeling vertical drag & drop list built on framer-motion's
 * Reorder primitives. Works with mouse, touch and pen; each row exposes a
 * dedicated grab handle (so text stays selectable) and keyboard arrows for
 * accessible reordering.
 */
export default function DragList<T extends DragItem>({
  items,
  onReorder,
  renderItem,
  disabled = false,
  onKeyboardMove,
  className,
}: DragListProps<T>) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      as="ul"
      className={`relative ${className ?? ""}`}
      layoutScroll
    >
      {items.map((item, index) => (
        <DragRow
          key={item.id}
          item={item}
          disabled={disabled}
          isLast={index === items.length - 1}
          index={index}
          onKeyboardMove={onKeyboardMove}
        >
          {(handle, isLast) => renderItem(item, index, handle, isLast)}
        </DragRow>
      ))}
    </Reorder.Group>
  );
}

function DragRow<T extends DragItem>({
  item,
  index,
  isLast,
  disabled,
  onKeyboardMove,
  children,
}: {
  item: T;
  index: number;
  isLast: boolean;
  disabled: boolean;
  onKeyboardMove?: (index: number, dir: -1 | 1) => void;
  children: (handle: ReactNode, isLast: boolean) => ReactNode;
}) {
  const controls = useDragControls();

  const handle: HandleProps = {
    onPointerDown: (event) => {
      if (disabled) return;
      event.preventDefault();
      controls.start(event);
    },
    onKeyDown: (event) => {
      if (disabled || !onKeyboardMove) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onKeyboardMove(index, -1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onKeyboardMove(index, 1);
      }
    },
    className: `flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:pointer-events-none disabled:opacity-30 ${
      disabled ? "opacity-30" : ""
    }`,
    "aria-label": `Drag to reorder — currently position ${index + 1}`,
    "aria-roledescription": "Drag handle. Focus and use arrow keys to reorder.",
    title: disabled ? "Clear search & filters to reorder" : "Drag to reorder",
  };

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      as="li"
      className="relative list-none"
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 12px 32px -12px rgba(0,0,0,0.35)",
        zIndex: 30,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      {children(
        disabled ? (
          <span
            className="flex size-7 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/30"
            title="Clear search & filters to reorder"
          >
            <GripVertical className="size-4" aria-hidden />
          </span>
        ) : (
          <button type="button" {...handle}>
            <GripVertical className="size-4 pointer-events-none" aria-hidden />
          </button>
        ),
        isLast
      )}
    </Reorder.Item>
  );
}
