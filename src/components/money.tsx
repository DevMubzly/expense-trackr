import type { Currency } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl",
  hero: "text-6xl",
} as const;

export type MoneySize = keyof typeof SIZES;

/**
 * Currency code and figure share the same size, weight and color so amounts
 * read as one unit everywhere.
 */
export function Money({
  value,
  currency = "UGX",
  size = "md",
  tone = "default",
  className,
  amountClassName,
}: {
  value: number;
  currency?: Currency;
  size?: MoneySize;
  tone?: "default" | "inverted";
  className?: string;
  amountClassName?: string;
}) {
  const scale = SIZES[size];
  const inverted = tone === "inverted";
  return (
    <span className={cn("tnum inline-flex items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "font-semibold leading-none tracking-[-0.02em]",
          inverted ? "text-background/60" : "text-muted-foreground",
          scale,
          amountClassName,
        )}
      >
        {currency === "UGX" ? "UGX" : "USD"}
      </span>
      <span
        className={cn(
          "font-semibold leading-none tracking-[-0.02em]",
          inverted ? "text-background" : "text-foreground",
          scale,
          amountClassName,
        )}
      >
        {formatNumber(value)}
      </span>
    </span>
  );
}
