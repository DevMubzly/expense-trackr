"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, ChartPie, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  AreaSparkline,
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Gauge,
  Grid,
  PieCenter,
  PieChart,
  PieSlice,
  XAxis,
  YAxis,
} from "@/components/charts";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/motion/card";
import { ExpandableTabs } from "@/components/motion/expandable-tabs";
import { Loader } from "@/components/motion/loader";
import { Panel, PanelHeader } from "@/components/panel";
import { useExpenseDialog } from "@/components/expense-dialog";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { categoryOf } from "@/lib/categories";
import {
  formatCompact,
  formatUgx,
  formatUgxCompact,
  parseYmd,
  relativeDay,
  ymd,
} from "@/lib/format";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

const MONTH_BARS = ["food", "transport", "bills", "fun", "shopping", "health", "other"];
const DECK = "w-[min(1000px,90vw)]";

export default function DashboardPage() {
  const { version, openExpense } = useExpenseDialog();
  const { data: stats, loading } = useApi<Stats>(`/api/stats?v=${version}`);
  const now = useNow();
  const today = now ? ymd(now) : "";

  const areaData = useMemo(
    () =>
      (stats?.cumulative ?? []).map((point) => ({
        date: parseYmd(point.date),
        spent: point.spent,
        pace: point.pace,
      })),
    [stats],
  );

  const budget = stats?.totals.budget ?? 0;
  const spent = stats?.totals.month ?? 0;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = Math.max(0, budget - spent);
  const over = spent > budget;

  const spark = useMemo(
    () => (stats?.daily ?? []).map((point) => ({ day: point.date, value: point.total })),
    [stats],
  );

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader variant="dot-matrix" size={28} />
        <p className="text-xs uppercase tracking-[0.2em]">Crunching the numbers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            {now
              ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
              : "\u00a0"}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-none md:text-6xl">
            {now ? `${greeting(now.getHours())}.` : "Hello."}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            You&apos;ve spent{" "}
            <span className="font-medium text-foreground">{formatUgx(spent)}</span> in{" "}
            {stats?.monthLabel} — {Math.round(pct)}% of the budget.{" "}
            {over ? "That's the budget gone." : `${formatUgxCompact(remaining)} still breathing.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedBadge status={over ? "danger" : pct > 80 ? "warning" : "success"}>
            {over ? "Over budget" : `${100 - Math.round(pct)}% left`}
          </AnimatedBadge>
          <button
            type="button"
            onClick={() => openExpense()}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <ReceiptText className="size-4" /> Log expense
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-12 overflow-hidden p-1 lg:col-span-8">
          <PanelHeader
            title="Month pace"
            hint={`Spend line vs a ${formatUgxCompact(budget)} budget pace`}
            action={
              stats ? (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    stats.vsLastMonth > 0 ? "text-destructive" : "text-emerald-500",
                  )}
                >
                  {stats.vsLastMonth > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {Math.abs(stats.vsLastMonth)}% vs last month
                </span>
              ) : null
            }
          />
          <div className="px-1 pb-2 pt-4">
            <AreaChart
              data={areaData}
              aspectRatio="2.4 / 1"
              margin={{ top: 10, right: 18, bottom: 28, left: 44 }}
            >
              <Grid horizontal />
              <Area
                dataKey="pace"
                fill="var(--muted-foreground)"
                fillOpacity={0}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
              />
              <Area
                dataKey="spent"
                fill="var(--chart-1)"
                stroke="var(--chart-1)"
                fillOpacity={0.45}
                strokeWidth={2.5}
                fadeBottom={40}
              />
              <YAxis formatValue={(value) => formatCompact(value)} />
              <XAxis />
              <ChartTooltip />
            </AreaChart>
          </div>
        </Panel>

        <div className="col-span-12 grid gap-4 lg:col-span-4">
          <Panel className="flex flex-col items-center justify-center p-4">
            <PanelHeader title="Budget" hint="This month" className="w-full" />
            <Gauge
              value={pct}
              centerValue={Math.round(pct)}
              suffix="%"
              defaultLabel="used"
              totalNotches={34}
              height={168}
              width={230}
              activeFill="var(--chart-1)"
              zones={[
                { from: 0, to: 75, color: "var(--chart-1)" },
                { from: 75, to: 100, color: "var(--destructive)" },
              ]}
              needle
            />
            <div className="grid w-full grid-cols-2 gap-2 pb-1 pt-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Spent</p>
                <p className="tnum text-sm font-semibold">{formatUgxCompact(spent)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Left</p>
                <p className="tnum text-sm font-semibold text-primary">{formatUgxCompact(remaining)}</p>
              </div>
            </div>
          </Panel>

          <Panel className="p-4">
            <PanelHeader title="Where it went" hint="By category" />
            <div className="flex items-center gap-3 pt-2">
              <PieChart
                data={(stats?.byCategory ?? []).map((entry) => ({
                  label: entry.label,
                  value: entry.value,
                  color: entry.color,
                }))}
                innerRadius={46}
                padAngle={0.03}
                cornerRadius={4}
                hoverOffset={8}
                size={150}
              >
                {(stats?.byCategory ?? []).map((entry, index) => (
                  <PieSlice key={entry.id} index={index} color={entry.color} showGlow />
                ))}
                <PieCenter defaultLabel="Total" formatOptions={{ notation: "compact", maximumFractionDigits: 1 }} />
              </PieChart>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {(stats?.byCategory ?? []).slice(0, 4).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: entry.color }} />
                    <span className="truncate text-muted-foreground">{entry.label}</span>
                    <span className="tnum ml-auto">{Math.round((entry.value / Math.max(1, spent)) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={stats?.totals.today ?? 0}
          spark={spark.slice(-10)}
          foot={`${stats?.totals.count ?? 0} entries this month`}
        />
        <StatCard label="This week" value={stats?.totals.week ?? 0} spark={spark.slice(-7)} foot="Rolling 7 days" />
        <StatCard
          label="Daily average"
          value={stats?.totals.avgPerDay ?? 0}
          spark={spark}
          foot={`Across ${stats?.daily.length ?? 0} days`}
        />
        <StatCard
          label="Biggest hit"
          value={stats?.totals.largest ?? 0}
          spark={spark}
          foot={`≈ $${formatCompact(Math.round((stats?.totals.usd ?? 0)))} this month`}
        />
      </div>

      <div className="flex justify-center">
        <ExpandableTabs
          defaultValue="recent"
          classNames={{ bar: "justify-center gap-2" }}
          items={[
            {
              id: "recent",
              label: "Recent",
              icon: <ReceiptText className="size-4" />,
              content: (
                <div className={DECK}>
                  <div className="flex items-start justify-between px-1 pb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Recent activity</p>
                      <p className="mt-0.5 text-xs text-muted-foreground/80">Latest entries, newest first</p>
                    </div>
                    <Link href="/expenses" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      All expenses <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {(stats?.recent ?? []).map((expense) => {
                      const category = categoryOf(expense.category);
                      return (
                        <li key={expense.id}>
                          <button
                            type="button"
                            onClick={() => openExpense(expense)}
                            className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-muted/40"
                          >
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-xl text-base"
                              style={{ background: `color-mix(in oklab, ${category.color} 16%, transparent)` }}
                            >
                              {category.emoji}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{expense.note || category.label}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {relativeDay(expense.spentOn, today)} · {category.label}
                              </span>
                            </span>
                            <span className="tnum text-sm">{formatUgx(expense.amountUgx)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            },
            {
              id: "categories",
              label: "Categories",
              icon: <ChartPie className="size-4" />,
              content: (
                <div className={DECK}>
                  <p className="px-1 pb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {stats?.monthLabel} — share of spend
                  </p>
                  <div className="space-y-4 px-1">
                    {(stats?.byCategory ?? []).map((entry) => (
                      <div key={entry.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{entry.label}</span>
                          <span className="tnum">{formatUgx(entry.value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(entry.value / Math.max(1, spent)) * 100}%`,
                              background: entry.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              id: "months",
              label: "Months",
              icon: <TrendingUp className="size-4" />,
              content: (
                <div className={DECK}>
                  <p className="px-1 pb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Last eight months
                  </p>
                  <BarChart
                    data={stats?.months ?? []}
                    xDataKey="label"
                    aspectRatio="3 / 1"
                    barGap={0.35}
                    margin={{ top: 10, right: 10, bottom: 30, left: 52 }}
                  >
                    <Grid horizontal />
                    <YAxis formatValue={(value) => formatCompact(value)} />
                    <Bar dataKey="total" fill="var(--chart-1)" lineCap="round" />
                    <BarXAxis />
                    <ChartTooltip />
                  </BarChart>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Panel className="p-5">
        <PanelHeader title="Daily flow" hint="Every day this month, stacked by category" className="p-0 pb-4" />
        <BarChart
          data={(stats?.daily ?? []).map((point) => ({
            ...point,
            label: String(Number(point.date.slice(-2))),
          }))}
          xDataKey="label"
          stacked
          aspectRatio="3.4 / 1"
          barGap={0.25}
          stackGap={1}
          margin={{ top: 10, right: 10, bottom: 30, left: 52 }}
        >
          <Grid horizontal />
          <YAxis formatValue={(value) => formatCompact(value)} />
          {MONTH_BARS.map((id) => {
            const category = categoryOf(id);
            return <Bar key={id} dataKey={id} fill={category.color} lineCap={2} />;
          })}
          <BarXAxis />
          <ChartTooltip />
        </BarChart>
      </Panel>
    </div>
  );
}

function greeting(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function StatCard({
  label,
  value,
  spark,
  foot,
}: {
  label: string;
  value: number;
  spark: { day: string; value: number }[];
  foot: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-[11px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-2">
        <p className="tnum font-display text-3xl leading-none">
          <AnimatedNumber value={value} startOnView={false} format={(n) => formatCompact(n)} />
          <span className="ml-1 font-sans text-xs text-muted-foreground">UGX</span>
        </p>
        <p className="text-[11px] text-muted-foreground">{foot}</p>
        <div className="pt-2">
          <AreaSparkline
            data={spark.length > 1 ? spark : [...spark, ...spark]}
            dataKey="value"
            height={44}
            color="var(--chart-1)"
            fill="gradient"
          />
        </div>
      </CardContent>
    </Card>
  );
}
