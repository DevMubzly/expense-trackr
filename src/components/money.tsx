import type { Currency } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { code: "text-[10px]", amount: "text-sm" },
  md: { code: "text-[11px]", amount: "text-base" },
  lg: { code: "text-xs", amount: "text-2xl" },
  xl: { code: "text-sm", amount: "text-4xl" },
  hero: { code: "text-base", amount: "text-6xl" },
} as const;

export type MoneySize = keyof typeof SIZES;

/**
 * Currency code always renders smaller and lighter than the figure, so the
 * number is what the eye lands on.
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
      <span className={cn("font-medium", inverted ? "text-background/60" : "text-muted-foreground", scale.code)}>
        {currency === "UGX" ? "UGX" : "USD"}
      </span>
      <span
        className={cn(
          "font-semibold leading-none tracking-[-0.02em]",
          inverted ? "text-background" : "text-foreground",
          scale.amount,
          amountClassName,
        )}
      >
        {formatNumber(value)}
      </span>
    </span>
  );
}
