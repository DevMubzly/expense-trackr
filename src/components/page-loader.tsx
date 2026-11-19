"use client";

import {
  Loader,
  type LoaderVariant,
} from "@/components/motion/loader";
import { cn } from "@/lib/utils";

export function PageLoader({
  variant = "helix",
  size = 30,
  label,
  className,
}: {
  variant?: LoaderVariant;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader variant={variant} size={size} />
        {label ? <p className="text-[13px]">{label}</p> : null}
      </div>
    </div>
  );
}
