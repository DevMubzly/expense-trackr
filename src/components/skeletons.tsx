"use client";

import { motion, useReducedMotion } from "motion/react";
import { Panel, sectionCardClass } from "@/components/panel";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export function PageReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={
        reduce ? { opacity: 1 } : { opacity: 0, y: 10, filter: "blur(4px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: reduce ? 0 : 0.34, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/35",
        className,
      )}
    >
      <span className="skeleton-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.07] to-transparent" />
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-2.5", className)} />;
}

function PageHeaderSkeleton() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="space-y-3">
        <SkeletonLine className="w-40" />
        <Skeleton className="h-8 w-56 rounded-lg" />
        <SkeletonLine className="w-72 max-w-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
    </header>
  );
}

export function SkeletonMetricCard({ compact = true }: { compact?: boolean }) {
  return (
    <Panel className="flex flex-col border border-foreground/10 p-1">
      <div className={cn("flex items-center gap-2", compact ? "px-3 pb-1.5 pt-2" : "px-3.5 pb-2 pt-2")}>
        <Skeleton className="size-3.5 rounded-full" />
        <SkeletonLine className="w-20" />
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col rounded-xl border border-foreground/10 bg-muted/15",
          compact ? "mt-1 p-3 px-4" : "mt-1 p-3.5 px-4",
        )}
      >
        <Skeleton className="h-4 w-28" />
        <SkeletonLine className="mt-2 w-24" />
        <Skeleton className="mt-3 h-8 w-full rounded-lg" />
      </div>
    </Panel>
  );
}

export function SkeletonChartShape({
  variant = "bars",
}: {
  variant?: "bars" | "area" | "radial" | "pie" | "heat";
}) {
  if (variant === "radial" || variant === "pie") {
    return (
      <div className="flex h-44 items-center justify-center">
        <Skeleton className="size-36 rounded-full" />
      </div>
    );
  }
  if (variant === "heat") {
    return (
      <div className="grid h-44 grid-cols-12 grid-rows-6 gap-1.5">
        {Array.from({ length: 72 }, (_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "rounded-[3px]",
              index % 7 === 0 ? "opacity-80" : index % 5 === 0 ? "opacity-55" : "",
            )}
          />
        ))}
      </div>
    );
  }
  if (variant === "area") {
    return (
      <div className="relative flex h-44 items-end overflow-hidden rounded-lg border border-foreground/5 bg-muted/10 p-3">
        <Skeleton className="absolute inset-x-3 bottom-3 h-24 rounded-t-[50%] opacity-50" />
        <Skeleton className="absolute inset-x-3 bottom-3 h-px" />
        <div className="relative flex h-full w-full items-end justify-between gap-2">
          {[30, 47, 39, 62, 54, 75, 68, 82, 71, 88].map((height, index) => (
            <Skeleton key={index} className="w-full rounded-t" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-44 items-end gap-2 rounded-lg border border-foreground/5 bg-muted/10 p-3">
      {[34, 60, 44, 78, 52, 88, 66, 47, 72, 58].map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-t" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

function SkeletonChartPanel({
  className,
  variant = "bars",
  titleWidth = "w-28",
  hintWidth = "w-20",
}: {
  className?: string;
  variant?: "bars" | "area" | "radial" | "pie" | "heat";
  titleWidth?: string;
  hintWidth?: string;
}) {
  return (
    <Panel className={cn(sectionCardClass, className)}>
      <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
        <div className="space-y-2">
          <SkeletonLine className={titleWidth} />
          <SkeletonLine className={cn("h-2 w-24", hintWidth)} />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="rounded-xl border border-foreground/5 bg-muted/10 p-3">
        <SkeletonChartShape variant={variant} />
      </div>
    </Panel>
  );
}

function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-foreground/5">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-2 py-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className={index % 2 === 0 ? "w-1/3" : "w-2/5"} />
            <SkeletonLine className="h-2 w-1/2" />
          </div>
          <SkeletonLine className="w-20" />
        </li>
      ))}
    </ul>
  );
}

function SkeletonSectionPanel({
  className,
  titleWidth = "w-28",
  hintWidth = "w-48",
  rows = 4,
  children,
}: {
  className?: string;
  titleWidth?: string;
  hintWidth?: string;
  rows?: number;
  children?: React.ReactNode;
}) {
  return (
    <Panel className={cn(sectionCardClass, className)}>
      <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
        <div className="space-y-2">
          <SkeletonLine className={titleWidth} />
          <SkeletonLine className={cn("h-2", hintWidth)} />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="rounded-xl border border-foreground/5 bg-muted/10 p-3">
        {children ?? <SkeletonRows rows={rows} />}
      </div>
    </Panel>
  );
}

export function HomePageSkeleton() {
  return (
    <PageReveal className="space-y-8">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="order-1 grid h-full auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:order-1 xl:col-span-5">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonMetricCard key={index} />
          ))}
        </aside>

        <Panel className={cn("order-2 overflow-hidden xl:order-2 xl:col-span-7", sectionCardClass)}>
          <div className="space-y-2 px-3 pb-2 pt-2">
            <SkeletonLine className="w-24" />
            <SkeletonLine className="h-2 w-36" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-4">
            <div className="mx-auto grid w-full max-w-[720px] grid-cols-2 items-center gap-0 md:grid-cols-[minmax(0,1fr)_340px_minmax(0,1fr)]">
              <div className="order-1 col-span-2 flex justify-center md:order-2 md:col-span-1">
                <Skeleton className="size-52 rounded-full md:size-60" />
              </div>
              <div className="order-2 flex flex-col items-center gap-2 md:order-1">
                <SkeletonLine className="w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="order-3 flex flex-col items-center gap-2">
                <SkeletonLine className="w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Skeleton className="h-7 w-40 rounded-full" />
            </div>
          </div>
        </Panel>

        <Panel className={cn("order-3 overflow-hidden xl:col-span-12", sectionCardClass)}>
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
            <div className="space-y-2">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="h-2 w-56" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="rounded-xl border border-foreground/10 bg-muted/10 p-2">
                  <SkeletonLine className="w-24" />
                  <Skeleton className="mt-2 h-8 w-full rounded-lg" />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <SkeletonChartShape variant="area" />
            </div>
          </div>
        </Panel>

        <Panel className={cn("order-4 xl:col-span-5", sectionCardClass)}>
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
            <div className="space-y-2">
              <SkeletonLine className="w-20" />
              <SkeletonLine className="h-2 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-1">
            <SkeletonRows rows={4} />
          </div>
        </Panel>

        <Panel className={cn("order-5 xl:col-span-7", sectionCardClass)}>
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
            <div className="space-y-2">
              <SkeletonLine className="w-28" />
              <SkeletonLine className="h-2 w-40" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-1">
            <SkeletonRows rows={5} />
          </div>
        </Panel>
      </div>
    </PageReveal>
  );
}

export function StatsBentoSkeleton() {
  return (
    <PageReveal className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonMetricCard key={index} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonChartPanel className="xl:col-span-3" variant="heat" titleWidth="w-20" />
        <SkeletonChartPanel className="xl:col-span-1" variant="radial" titleWidth="w-16" />
        <SkeletonChartPanel className="xl:col-span-2" variant="bars" titleWidth="w-24" />
        <SkeletonChartPanel className="xl:col-span-2" variant="pie" titleWidth="w-20" />
        <SkeletonChartPanel className="xl:col-span-2" variant="bars" titleWidth="w-28" />
        <SkeletonChartPanel className="xl:col-span-2" variant="area" titleWidth="w-24" />
      </div>
    </PageReveal>
  );
}

export function PlanPageSkeleton() {
  return (
    <PageReveal className="space-y-8">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonMetricCard key={index} />
        ))}
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-10 w-full max-w-md rounded-full" />
      </div>
      <Panel className={sectionCardClass}>
        <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
          <div className="space-y-2">
            <SkeletonLine className="w-32" />
            <SkeletonLine className="h-2 w-56" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="rounded-xl border border-foreground/5 bg-muted/10 p-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-foreground/10 bg-muted/10 p-3">
              <SkeletonLine className="w-32" />
              <div className="mt-3">
                <SkeletonChartShape variant="area" />
              </div>
            </div>
            <div className="rounded-xl border border-foreground/10 bg-muted/10 p-3">
              <SkeletonLine className="w-32" />
              <div className="mt-3">
                <SkeletonChartShape variant="bars" />
              </div>
            </div>
          </div>
        </div>
      </Panel>
      <SkeletonSectionPanel rows={5} hintWidth="w-64" />
    </PageReveal>
  );
}

export function SettingsPageSkeleton() {
  return (
    <PageReveal className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-12 gap-6">
        <Panel className={cn(sectionCardClass, "col-span-12 lg:col-span-7")}>
          <div className="flex items-start justify-between px-3 pb-2 pt-2">
            <div className="space-y-2">
              <SkeletonLine className="w-20" />
              <SkeletonLine className="h-2 w-44" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-5">
            <div className="flex gap-5">
              <Skeleton className="size-20 shrink-0 rounded-full" />
              <div className="flex-1 space-y-4">
                <SkeletonLine className="w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <SkeletonLine className="w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </Panel>
        <Panel className={cn(sectionCardClass, "col-span-12 lg:col-span-5")}>
          <div className="space-y-2 px-3 pb-2 pt-2">
            <SkeletonLine className="w-24" />
            <SkeletonLine className="h-2 w-40" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-5">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <SkeletonLine className="w-20" />
                <Skeleton className="size-10 rounded-xl" />
              </div>
              <div className="flex items-center gap-4">
                <SkeletonLine className="w-20" />
                <Skeleton className="h-9 flex-1 rounded-full" />
              </div>
            </div>
          </div>
        </Panel>
        <Panel className={cn(sectionCardClass, "col-span-12")}>
          <div className="space-y-2 px-3 pb-2 pt-2">
            <SkeletonLine className="w-28" />
            <SkeletonLine className="h-2 w-52" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-5">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
              <div className="space-y-4">
                <SkeletonLine className="w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <SkeletonLine className="w-32" />
                <Skeleton className="h-24 w-64 rounded-xl" />
              </div>
            </div>
          </div>
        </Panel>
        <Panel className={cn(sectionCardClass, "col-span-12")}>
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
            <div className="space-y-2">
              <SkeletonLine className="w-20" />
              <SkeletonLine className="h-2 w-48" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <SkeletonMetricCard key={index} />
              ))}
            </div>
            <div className="mt-4">
              <SkeletonRows rows={3} />
            </div>
          </div>
        </Panel>
        <Panel className={cn(sectionCardClass, "col-span-12")}>
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
            <div className="space-y-2">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="h-2 w-44" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-1">
            <SkeletonRows rows={4} />
          </div>
        </Panel>
        <Panel className={cn(sectionCardClass, "col-span-12")}>
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
            <div className="space-y-2">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="h-2 w-40" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="rounded-xl border border-foreground/5 bg-muted/10 p-4">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <SkeletonLine className="mb-3 w-20" />
                <SkeletonRows rows={4} />
              </div>
              <div>
                <SkeletonLine className="mb-3 w-16" />
                <SkeletonRows rows={4} />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </PageReveal>
  );
}

export function ExpensesTableSkeleton() {
  return (
    <Panel className={cn("overflow-hidden", sectionCardClass)}>
      <div className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[992px]">
            <div className="flex items-center gap-4 border-b border-border/70 bg-muted/20 px-4 py-3">
              <Skeleton className="size-4 rounded-sm" />
              <SkeletonLine className="w-16" />
              <SkeletonLine className="w-40" />
              <SkeletonLine className="w-16" />
              <SkeletonLine className="w-24" />
              <SkeletonLine className="w-24" />
              <SkeletonLine className="w-20" />
            </div>
            <div className="divide-y divide-foreground/5">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="flex items-center gap-4 px-4 py-4">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="h-3 w-16" />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Skeleton className="size-7 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <SkeletonLine className={index % 2 === 0 ? "w-1/3" : "w-2/5"} />
                      <SkeletonLine className="h-2 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <SkeletonLine className="w-24" />
                  <SkeletonLine className="w-20" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
