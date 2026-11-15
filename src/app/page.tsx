"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight01Icon,
  PieChartIcon,
  PlusSignIcon,
  ReceiptTextIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "@hugeicons/core-free-icons";
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
  XAxis,
  YAxis,
} from "@/components/charts";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { ExpandableTabs } from "@/components/motion/expandable-tabs";
import { TiltCard } from "@/components/motion/tilt-card";
import { Loader } from "@/components/motion/loader";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { Panel, PanelHeader } from "@/components/panel";
import { useExpenseDialog } from "@/components/expense-dialog";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { categoryOf } from "@/lib/categories";
import { formatNumber, parseYmd, relativeDay, ymd } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

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
        <Loader variant="dot-matrix" size={26} />
        <p className="text-[13px]">Crunching the numbers</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[13px] text-muted-foreground">
            {now
              ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
              : "\u00a0"}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-none md:text-[56px]">
            {now ? `${greeting(now.getHours())}.` : "Hello."}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            You have spent{" "}
            <span className="font-medium text-foreground">
              {formatNumber(spent)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">UGX</span>
            </span>{" "}
            in {stats?.monthLabel}. That is {Math.round(pct)}% of the budget, with{" "}
            {over ? (
              "nothing left."
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {formatNumber(remaining)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">UGX</span>
                </span>{" "}
                left.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedBadge status={over ? "danger" : pct > 80 ? "warning" : "success"}>
            {over ? "Over budget" : `${100 - Math.round(pct)}% left`}
          </AnimatedBadge>
          <button
            type="button"
            onClick={() => openExpense()}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Icon icon={PlusSignIcon} className="size-4" /> Log expense
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <Panel className="col-span-12 overflow-hidden p-6 xl:col-span-8">
          <PanelHeader
            title="Month pace"
            hint="Spend against a straight-line budget"
            action={
              stats ? (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    stats.vsLastMonth > 0 ? "text-destructive" : "text-emerald-600",
                  )}
                >
                  <Icon
                    icon={stats.vsLastMonth > 0 ? TrendingUpIcon : TrendingDownIcon}
                    className="size-3.5"
                  />
                  {Math.abs(stats.vsLastMonth)}% versus last month
                </span>
              ) : null
            }
            className="p-0"
          />
          <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-primary" /> Spent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-muted-foreground/50" /> Budget pace
            </span>
          </div>
          <div className="mt-2">
            <AreaChart
              data={areaData}
              aspectRatio="2.6 / 1"
              margin={{ top: 12, right: 12, bottom: 30, left: 72 }}
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
                fillOpacity={0.32}
                strokeWidth={2.5}
                fadeBottom={45}
              />
              <YAxis formatValue={(value) => formatNumber(value)} />
              <XAxis />
              <ChartTooltip />
            </AreaChart>
          </div>
        </Panel>

        <div className="col-span-12 xl:col-span-4">
          <TiltCard max={5} className="h-full">
            <Panel className="flex h-full flex-col justify-between p-6">
              <PanelHeader title="Budget" hint="This month" className="p-0" />
              <div className="flex flex-col items-center py-2">
                <Gauge
                  value={pct}
                  centerValue={Math.round(pct)}
                  suffix="%"
                  defaultLabel="used"
                  totalNotches={36}
                  height={170}
                  width={240}
                  activeFill="var(--chart-1)"
                  inactiveFill="var(--muted)"
                  needle="line"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <Money value={spent} size="md" className="mt-1" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Left</p>
                  <Money value={remaining} size="md" className="mt-1" />
                </div>
              </div>
            </Panel>
          </TiltCard>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={stats?.totals.today ?? 0}
          spark={spark.slice(-10)}
          foot="Rolling today"
        />
        <StatCard
          label="This week"
          value={stats?.totals.week ?? 0}
          spark={spark.slice(-7)}
          foot="Last seven days"
        />
        <StatCard
          label="Daily average"
          value={stats?.totals.avgPerDay ?? 0}
          spark={spark}
          foot={`Across ${stats?.daily.length ?? 0} days`}
        />
        <StatCard
          label="Largest expense"
          value={stats?.totals.largest ?? 0}
          spark={spark}
          foot={`${stats?.totals.count ?? 0} entries this month`}
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
              icon: <Icon icon={ReceiptTextIcon} className="size-4" />,
              content: (
                <div className={DECK}>
                  <div className="flex items-start justify-between px-1 pb-3">
                    <div>
                      <p className="text-[13px] font-medium">Recent activity</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Latest entries, newest first</p>
                    </div>
                    <Link
                      href="/expenses"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      All expenses <Icon icon={ArrowUpRight01Icon} className="size-3.5" />
                    </Link>
                  </div>
                  <ul className="divide-y divide-border/70">
                    {(stats?.recent ?? []).map((expense) => {
                      const category = categoryOf(expense.category);
                      return (
                        <li key={expense.id}>
                          <button
                            type="button"
                            onClick={() => openExpense(expense)}
                            className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-muted/50"
                          >
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-lg"
                              style={{ background: `color-mix(in oklab, ${category.color} 14%, transparent)` }}
                            >
                              <Icon icon={category.icon} className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{expense.note || category.label}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {relativeDay(expense.spentOn, today)}, {category.label}
                              </span>
                            </span>
                            <Money value={expense.amountUgx} size="sm" />
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
              icon: <Icon icon={PieChartIcon} className="size-4" />,
              content: (
                <div className={DECK}>
                  <p className="px-1 pb-4 text-[13px] font-medium">
                    {stats?.monthLabel}, share of spend
                  </p>
                  <div className="space-y-4 px-1">
                    {(stats?.byCategory ?? []).map((entry) => (
                      <div key={entry.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Icon icon={categoryOf(entry.id).icon} className="size-3.5" />
                            {entry.label}
                          </span>
                          <span className="tnum text-foreground">{formatNumber(entry.value)} UGX</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
              icon: <Icon icon={TrendingUpIcon} className="size-4" />,
              content: (
                <div className={DECK}>
                  <p className="px-1 pb-2 text-[13px] font-medium">Last eight months</p>
                  <BarChart
                    data={stats?.months ?? []}
                    xDataKey="label"
                    aspectRatio="3 / 1"
                    barGap={0.35}
                    margin={{ top: 10, right: 10, bottom: 30, left: 80 }}
                  >
                    <Grid horizontal />
                    <YAxis formatValue={(value) => formatNumber(value)} />
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

      <Panel className="p-6">
        <PanelHeader
          title="Daily flow"
          hint="Every day this month, stacked by category"
          className="p-0 pb-4"
        />
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
          margin={{ top: 10, right: 10, bottom: 30, left: 80 }}
        >
          <Grid horizontal />
          <YAxis formatValue={(value) => formatNumber(value)} />
          <Bar dataKey="food" fill={categoryOf("food").color} lineCap={2} />
          <Bar dataKey="transport" fill={categoryOf("transport").color} lineCap={2} />
          <Bar dataKey="bills" fill={categoryOf("bills").color} lineCap={2} />
          <Bar dataKey="fun" fill={categoryOf("fun").color} lineCap={2} />
          <Bar dataKey="shopping" fill={categoryOf("shopping").color} lineCap={2} />
          <Bar dataKey="health" fill={categoryOf("health").color} lineCap={2} />
          <Bar dataKey="other" fill={categoryOf("other").color} lineCap={2} />
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
    <Panel className="p-5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <div className="mt-2">
        <Money value={value} size="lg" />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{foot}</p>
      <div className="mt-3">
        <AreaSparkline
          data={spark.length > 1 ? spark : [...spark, ...spark]}
          dataKey="value"
          height={40}
          color="var(--chart-1)"
          fill="gradient"
        />
      </div>
    </Panel>
  );
}
