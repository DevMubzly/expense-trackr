import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export type IconType = IconSvgElement;

/**
 * Thin wrapper so every icon in the app shares one stroke weight and sizing
 * convention. Hugeicons ships as data, not components, so this keeps call
 * sites readable.
 */
export function Icon({
  icon,
  className,
  strokeWidth = 1.6,
  size = "1em",
}: {
  icon: IconSvgElement;
  className?: string;
  strokeWidth?: number;
  size?: number | string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("size-4 shrink-0", className)}
    />
  );
}
