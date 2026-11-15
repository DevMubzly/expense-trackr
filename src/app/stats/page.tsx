"use client";

import { useMemo } from "react";
import { ChartPie, Clock3, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  PieCenter,
  PieChart,
  PieSlice,
  RadialAxis,
  RadialBar,
  RadialCenter,
  RadialChart,
  RadialLegend,
  YAxis,
} from "@/components/charts";
import { MorphingTabs } from "@/components/motion/morphing-tabs";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Loader } from "@/components/motion/loader";
import { Panel, PanelHeader } from "@/components/panel";
import { useApi } from "@/lib/use-api";
import { CATEGORIES } from "@/lib/categories";
import { addDays, formatCompact, formatNumber, formatUgx, formatUgxCompact, parseYmd, ymd } from "@/lib/format";
import type { Stats } from "@/lib/types";

function toHeatmap(days: { date: string; total: number }[]) {
  if (days.length === 0) return [];
  const byDate = new Map(days.map((day) => [day.date, day.total]));
  const first = parseYmd(days[0].date);
  const last = parseYmd(days[days.length - 1].date);
  let cursor = addDays(first, -first.getDay());

  const columns: { bin: number; bins: { bin: number; date: Date; count: number }[] }[] = [];
  while (cursor <= last) {
    const bins = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(cursor, index);
      return { bin: index, date, count: byDate.get(ymd(date)) ?? 0 };
    });
    columns.push({ bin: columns.length, bins });
    cursor = addDays(cursor, 7);
  }
  return columns;
}

export default function StatsPage() {
  const { data: stats, loading } = useApi<Stats>("/api/stats");

  const heat = useMemo(() => toHeatmap(stats?.heat ?? []), [stats]);

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader variant="newton" size={32} />
      </div>
    );
  }

  const daily = stats?.daily ?? [];
  const weekday = stats?.weekday ?? [];
  const total = stats?.totals.month ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Insights</p>
        <h1 className="mt-1 font-display text-5xl leading-none md:text-6xl">The shape of your spending.</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {stats?.monthLabel} at a glance — trends, category splits, and the days your wallet hates.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Spent this month", value: total, format: formatCompact, suffix: "UGX" },
          { label: "Entries", value: stats?.totals.count ?? 0, format: (n: number) => String(Math.round(n)), suffix: "" },
          { label: "Average day", value: stats?.totals.avgPerDay ?? 0, format: formatCompact, suffix: "UGX" },
          { label: "Largest single", value: stats?.totals.largest ?? 0, format: formatCompact, suffix: "UGX" },
        ].map((item) => (
          <Panel key={item.label} className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            <p className="tnum mt-2 font-display text-3xl leading-none">
              <AnimatedNumber value={item.value} startOnView={false} format={item.format} />
              {item.suffix ? <span className="ml-1 font-sans text-xs text-muted-foreground">{item.suffix}</span> : null}
            </p>
          </Panel>
        ))}
      </div>

      <MorphingTabs
        defaultValue="trend"
        classNames={{ content: "bg-card text-card-foreground" }}
        items={[
          {
            id: "trend",
            label: "Trend",
            icon: <TrendingUp className="size-4" />,
            content: (
              <div className="space-y-4">
                <Panel className="p-5">
                  <PanelHeader title="Month by month" hint="Total spend, last eight months" className="p-0 pb-4" />
                  <div>
                  <BarChart
                    data={stats?.months ?? []}
                    xDataKey="label"
                    barGap={0.35}
                    margin={{ top: 10, right: 10, bottom: 30, left: 56 }}
                  >
                    <Grid horizontal />
                    <YAxis formatValue={(value) => formatCompact(value)} />
                    <Bar dataKey="total" fill="var(--chart-1)" lineCap="round" />
                    <BarXAxis />
                    <ChartTooltip />
                  </BarChart>
                  </div>
                </Panel>

                <Panel className="p-5">
                  <PanelHeader title="Daily rhythm" hint="Every day this month, stacked by category" className="p-0 pb-4" />
                  <div>
                  <BarChart
                    data={daily.map((point) => ({
                      ...point,
                      label: String(Number(point.date.slice(-2))),
                    }))}
                    xDataKey="label"
                    stacked
                    barGap={0.25}
                    stackGap={1}
                    margin={{ top: 10, right: 10, bottom: 30, left: 56 }}
                  >
                    <Grid horizontal />
                    <YAxis formatValue={(value) => formatCompact(value)} />
                    {CATEGORIES.map((category) => (
                      <Bar key={category.id} dataKey={category.id} fill={category.color} lineCap={2} />
                    ))}
                    <BarXAxis />
                    <ChartTooltip />
                  </BarChart>
                  </div>
                </Panel>
              </div>
            ),
          },
          {
            id: "categories",
            label: "Categories",
            icon: <ChartPie className="size-4" />,
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel className="p-5">
                  <PanelHeader title="Share of spend" hint={stats?.monthLabel} className="p-0 pb-2" />
                  <div className="flex justify-center py-2">
                    <PieChart
                      data={(stats?.byCategory ?? []).map((entry) => ({
                        label: entry.label,
                        value: entry.value,
                        color: entry.color,
                      }))}
                      innerRadius={82}
                      padAngle={0.035}
                      cornerRadius={6}
                      hoverOffset={10}
                      size={280}
                    >
                      {(stats?.byCategory ?? []).map((entry, index) => (
                        <PieSlice key={entry.id} index={index} color={entry.color} showGlow />
                      ))}
                      <PieCenter defaultLabel="Total" formatOptions={{ notation: "compact", maximumFractionDigits: 1 }} />
                    </PieChart>
                  </div>
                </Panel>

                <Panel className="p-5">
                  <PanelHeader title="Ranked" hint="Biggest categories first" className="p-0 pb-4" />
                  <div className="space-y-3">
                    {(stats?.byCategory ?? []).map((entry) => (
                      <div key={entry.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span className="size-2 rounded-full" style={{ background: entry.color }} />
                            {entry.label}
                          </span>
                          <span className="tnum">
                            {formatUgx(entry.value)}
                            <span className="ml-2 text-muted-foreground">
                              {Math.round((entry.value / Math.max(1, total)) * 100)}%
                            </span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(entry.value / Math.max(1, total)) * 100}%`, background: entry.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            ),
          },
          {
            id: "timing",
            label: "Timing",
            icon: <Clock3 className="size-4" />,
            content: (
              <div className="space-y-4">
                <Panel className="p-5">
                  <PanelHeader title="Spending heat" hint="Intensity per day, last eight months" className="p-0 pb-4" />
                  <HeatmapInteractionProvider>
                    <HeatmapInteractionBoundary>
                      <div className="flex w-full flex-col gap-3">
                        <HeatmapChart className="w-full" data={heat} layout="fluid" gap={3}>
                          <HeatmapCells />
                          <HeatmapXAxis />
                          <HeatmapYAxis />
                          <HeatmapTooltip />
                        </HeatmapChart>
                        <HeatmapLegend />
                      </div>
                    </HeatmapInteractionBoundary>
                  </HeatmapInteractionProvider>
                </Panel>

                <Panel className="p-5">
                  <PanelHeader title="By weekday" hint="Where the week gets expensive" className="p-0 pb-2" />
                  <div className="h-[420px]">
                    <RadialChart
                      angleType="band"
                      data={weekday}
                      xDataKey="day"
                      series={[{ dataKey: "value", label: "Spend" }]}
                      maxValue="auto"
                    >
                      <RadialBar />
                      <RadialAxis showCircle={false} />
                      <RadialCenter />
                      <RadialLegend />
                    </RadialChart>
                  </div>
                </Panel>
              </div>
            ),
          },
        ]}
      />

      <p className="text-center text-[11px] text-muted-foreground">
        Peak day: {formatUgxCompact(Math.max(0, ...weekday.map((day) => day.value)))} · avg{" "}
        {formatNumber(stats?.totals.avgPerDay ?? 0)} UGX/day
      </p>
    </div>
  );
}
