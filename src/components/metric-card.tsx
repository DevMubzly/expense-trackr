"use client";

import type { IconSvgElement } from "@hugeicons/react";
import {
  useCallback,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AreaSparkline } from "@/components/charts";
import { useCurrency } from "@/components/currency-provider";
import { CURRENCY_META } from "@/lib/currencies";
import { Icon } from "@/components/huge-icon";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Panel } from "@/components/panel";
import { SectionInfo } from "@/components/section-info";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type SparkDatum = Record<string, unknown>;

export type MetricTone =
  | "orange"
  | "emerald"
  | "sky"
  | "violet"
  | "amber"
  | "rose";

const TONES: Record<MetricTone, string> = {
  orange: "text-orange-600 dark:text-orange-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  sky: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
};

export function MetricCard<T extends SparkDatum = SparkDatum>({
  label,
  value,
  foot,
  money = true,
  unit,
  spark,
  sparkKey,
  sparkLabelKey,
  compact = false,
  sparkColor = "var(--chart-1)",
  icon,
  info,
  tone = "orange",
  className,
}: {
  label: string;
  value: number;
  foot?: string;
  money?: boolean;
  unit?: string;
  spark?: readonly T[];
  sparkKey?: keyof T | ((datum: T, index: number) => number);
  sparkLabelKey?: keyof T | ((datum: T, index: number) => string | undefined);
  compact?: boolean;
  sparkColor?: string;
  icon?: IconSvgElement;
  info?: string;
  tone?: MetricTone;
  className?: string;
}) {
  const dataKey = (sparkKey ?? "value") as keyof T;
  const display = useCurrency();
  const displayUnit = unit ?? display.unit;
  const displayValue = value;
  const formatDisplay = (next: number) =>
    money && display.currency !== "UGX"
      ? next.toLocaleString("en-US", {
          minimumFractionDigits: CURRENCY_META[display.currency].decimals,
          maximumFractionDigits: CURRENCY_META[display.currency].decimals,
        })
      : formatNumber(next);
  const [hovered, setHovered] = useState<{
    datum: T;
    index: number;
    x: number;
  } | null>(null);

  const handleHoverChange = useCallback(
    (index: number | null, datum: T | null) => {
      setHovered((current) => {
        if (index === null || datum === null) return null;
        return { datum, index, x: current?.x ?? 0 };
      });
    },
    [],
  );

  const handleSparkPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.min(
        Math.max(event.clientX - rect.left, 72),
        Math.max(72, rect.width - 72),
      );
      setHovered((current) => (current ? { ...current, x } : current));
    },
    [],
  );

  const readSparkValue = (datum: T, index: number) =>
    typeof sparkKey === "function"
      ? sparkKey(datum, index)
      : Number(datum[(sparkKey ?? "value") as keyof T] ?? 0);

  const readSparkLabel = (datum: T, index: number) => {
    if (sparkLabelKey !== undefined) {
      return typeof sparkLabelKey === "function"
        ? (sparkLabelKey(datum, index) ?? "")
        : String(datum[sparkLabelKey] ?? "");
    }
    const row = datum as Record<string, unknown>;
    return String(row.label ?? row.day ?? row.date ?? index + 1);
  };

  return (
    <Panel
      className={cn(
        "flex flex-col border border-foreground/10",
        "p-1",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          compact ? "px-3 pb-1.5 pt-2" : "px-3.5 pb-2 pt-2",
        )}
      >
        {icon ? (
          <Icon
            icon={icon}
            className={cn("size-3.5 shrink-0", TONES[tone])}
          />
        ) : null}
        <p
          className={cn(
            "truncate text-foreground",
            compact ? "text-sm" : "text-[15px]",
          )}
        >
          {label}
        </p>
        {info ? <SectionInfo label={label}>{info}</SectionInfo> : null}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col rounded-xl border border-foreground/10 bg-muted/50",
          compact ? "mt-1 p-3 px-4" : "mt-1 p-3.5 px-4",
        )}
      >
        <div className={compact ? "mt-1" : "mt-1.5"}>
          {money ? (
            <span className="tnum inline-flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-sm font-semibold leading-none tracking-[-0.02em] text-muted-foreground",
                )}
              >
                {displayUnit}
              </span>
              <AnimatedNumber
                value={displayValue}
                duration={0.6}
                startOnView={false}
                format={formatDisplay}
                className="text-sm font-semibold leading-none tracking-[-0.02em]"
              />
            </span>
          ) : (
            <AnimatedNumber
              value={value}
              duration={0.6}
              startOnView={false}
              format={formatNumber}
              className="text-sm font-semibold leading-none tracking-[-0.02em]"
            />
          )}
        </div>

        {foot ? (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "mt-1 text-[10px]" : "mt-1.5 text-[11px]",
            )}
          >
            {foot}
          </p>
        ) : null}

        {spark && spark.length > 0 ? (
          <div
            className={cn(
              "relative",
              compact ? "mt-auto pt-2" : "mt-auto pt-2.5",
            )}
            onPointerMove={handleSparkPointerMove}
            onPointerLeave={() => setHovered(null)}
          >
            {hovered ? (
              <div
                className="pointer-events-none absolute bottom-full z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full border border-border/50 bg-popover/95 px-2 py-1 text-[10px] leading-none text-popover-foreground shadow-lg backdrop-blur-sm"
                style={{ left: hovered.x }}
              >
                <span className="text-muted-foreground">
                  {readSparkLabel(hovered.datum, hovered.index)}
                </span>
                <span className="tnum ml-1.5 font-medium">
                  {money ? (
                    <>
                      <span className="font-normal text-muted-foreground">
                        {displayUnit}
                      </span>{" "}
                      {display.formatValue(
                        readSparkValue(hovered.datum, hovered.index),
                      )}
                    </>
                  ) : (
                    formatNumber(
                      readSparkValue(hovered.datum, hovered.index),
                    )
                  )}
                </span>
              </div>
            ) : null}
            <AreaSparkline
              data={spark.length > 1 ? spark : [...spark, ...spark]}
              dataKey={dataKey}
              height={compact ? 32 : 40}
              color={sparkColor}
              fill="gradient"
              onHoverChange={handleHoverChange}
            />
          </div>
        ) : (
          <div className="mt-auto" />
        )}
      </div>
    </Panel>
  );
}
