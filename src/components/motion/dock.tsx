"use client";
// beui.dev/components/motion/dock

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DockContextValue = {
  size: number;
};

const DockContext = createContext<DockContextValue | null>(null);

export interface DockProps {
  children: ReactNode;
  className?: string;
  /** Size of each item in px. */
  size?: number;
}

export function Dock({ children, size = 44, className }: DockProps) {
  const ctx = useMemo<DockContextValue>(() => ({ size }), [size]);

  return (
    <DockContext.Provider value={ctx}>
      <div
        className={cn(
          "app-dock inline-flex h-auto items-end gap-1.5 rounded-full border border-white/10 bg-zinc-950/95 px-2 py-0.5 text-white shadow-2xl backdrop-blur-xl",
          className,
        )}
      >
        {children}
      </div>
    </DockContext.Provider>
  );
}

export interface DockItemProps {
  children: ReactNode;
  className?: string;
  /** When set, the item renders as a <button>. Omit when children carry their own link or button. */
  onClick?: () => void;
  active?: boolean;
  "aria-label"?: string;
}

export function DockItem({
  children,
  className,
  onClick,
  active,
  ...rest
}: DockItemProps) {
  const dock = useContext(DockContext);
  const size = dock?.size ?? 44;
  const sharedStyle = { width: size, height: size };
  const sharedClass = cn(
    "relative flex shrink-0 items-center justify-center rounded-full text-white",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={rest["aria-label"]}
        aria-pressed={active}
        style={sharedStyle}
        className={cn(
          sharedClass,
          "cursor-pointer border-0 bg-transparent p-0 outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {children}
      </button>
    );
  }

  // Children carry their own link or button (and its accessible name).
  return (
    <div
      style={sharedStyle}
      data-active={active || undefined}
      className={sharedClass}
    >
      {children}
    </div>
  );
}

export function DockSeparator({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("mx-1 h-6 w-px self-center bg-white/15", className)}
    />
  );
}
