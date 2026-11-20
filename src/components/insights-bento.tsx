"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  ChartIncreaseIcon,
  Invoice02Icon,
  Money03Icon,
  ReceiptTextIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import {
  Area,
  AreaChart,
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
  PieTicks,
  RadialAxis,
  RadialBar,
  RadialCenter,
  RadialChart,
  XAxis,
  YAxis,
} from "@/components/charts";
import { useTransactionDialog } from "@/components/expense-dialog";
import { Icon } from "@/components/huge-icon";
import { MetricCard } from "@/components/metric-card";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { PageLoader } from "@/components/page-loader";
import { SectionPanel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";
import { useCategories } from "@/components/categories-provider";
import { useCurrency } from "@/components/currency-provider";
import { addDays, formatNumber, parseYmd, ymd } from "@/lib/format";
import type { StatPeriod, Stats } from "@/lib/types";
import { useNow } from "@/lib/use-now";

const HEAT_WINDOW_DAYS = 182;
const HEAT_STEP_DAYS = 15;

function monthDayLabel(value: string) {
  return parseYmd(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function shiftMonthKey(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return "";
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12 + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function toHeatmap(days: { date: string; total: number }[]) {
  if (days.length === 0) return [];
  const byDate = new Map(days.map((day) => [day.date, day.total]));
  const first = parseYmd(days[0].date);
  const last = parseYmd(days[days.length - 1].date);
  let cursor = addDays(first, -first.getDay());

  const columns: {
    bin: number;
    bins: { bin: number; date: Date; count: number }[];
  }[] = [];
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

export function InsightsBento({ period }: { period: StatPeriod }) {
  const { expense: expenseCategories } = useCategories();
  const display = useCurrency();
  const formatDisplay = (value: number) =>
    display.currency === "USD"
      ? display.convert(value).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : formatNumber(value);
  const { version } = useTransactionDialog();
  const now = useNow();
  const [monthPage, setMonthPage] = useState(0);
  const [weekdayMonth, setWeekdayMonth] = useState<string | null>(null);
  const [categoriesMonth, setCategoriesMonth] = useState<string | null>(null);
  const [cumulativeMonth, setCumulativeMonth] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [heatPage, setHeatPage] = useState(0);
  const currentMonth = now ? ymd(now).slice(0, 7) : "";
  const weekdayMonthKey = weekdayMonth ?? currentMonth;
  const categoriesMonthKey = categoriesMonth ?? currentMonth;
  const cumulativeMonthKey = cumulativeMonth ?? currentMonth;

  const { data: stats, loading } = useApi<Stats>(
    `/api/stats?period=${period}&dayOffset=${dayOffset}&v=${version}`,
  );
  const { data: weekdayStats } = useApi<Stats>(
    currentMonth
      ? `/api/stats?month=${weekdayMonthKey}&v=${version}`
      : null,
  );
  const { data: categoriesStats } = useApi<Stats>(
    currentMonth
      ? `/api/stats?month=${categoriesMonthKey}&v=${version}`
      : null,
  );
  const { data: cumulativeStats } = useApi<Stats>(
    currentMonth
      ? `/api/stats?month=${cumulativeMonthKey}&v=${version}`
      : null,
  );

  const heatSource = stats?.heat;
  const maxHeatPage = Math.max(
    0,
    Math.floor(
      Math.max(0, (heatSource?.length ?? 0) - HEAT_WINDOW_DAYS) /
        HEAT_STEP_DAYS,
    ),
  );
  const heatEnd = Math.max(
    0,
    (heatSource?.length ?? 0) - heatPage * HEAT_STEP_DAYS,
  );
  const heatStart = Math.max(0, heatEnd - HEAT_WINDOW_DAYS);
  const heatData = useMemo(
    () => (heatSource ?? []).slice(heatStart, heatEnd),
    [heatSource, heatEnd, heatStart],
  );
  const heat = useMemo(() => toHeatmap(heatData), [heatData]);
  const entriesByDate = useMemo(
    () => new Map(heatData.map((day) => [day.date, day.count])),
    [heatData],
  );
  const heatEntries = useMemo(
    () => heatData.reduce((sum, day) => sum + day.count, 0),
    [heatData],
  );
  const heatFirst = heatData[0]?.date;
  const heatLast = heatData[heatData.length - 1]?.date;
  const cumulativeData = useMemo(
    () =>
      ((cumulativeStats?.cumulative ?? stats?.cumulative) ?? []).map(
        (point) => ({
          date: parseYmd(point.date),
          spent: point.spent,
          pace: point.pace,
        }),
      ),
    [cumulativeStats, stats],
  );

  if (loading && !stats) {
    return <PageLoader variant="newton" size={30} />;
  }

  const periodStats = stats?.period;
  const spark = periodStats?.spark ?? [];
  const daily30 = stats?.daily30 ?? [];
  const averageEntry =
    periodStats && periodStats.count > 0
      ? Math.round(periodStats.expense / periodStats.count)
      : 0;
  const biggestSpark = spark.length
    ? spark.reduce(
        (best, point) => (point.expense > best.expense ? point : best),
        spark[0],
      )
    : null;
  const weekday = weekdayStats?.weekday ?? stats?.weekday ?? [];
  const weekdayLabel =
    weekdayStats?.monthLabel ?? stats?.monthLabel ?? "This month";
  const categoriesLabel =
    categoriesStats?.monthLabel ?? stats?.monthLabel ?? "This month";
  const cumulativeLabel =
    cumulativeStats?.monthLabel ?? stats?.monthLabel ?? "This month";
  const months = stats?.months ?? [];
  const MONTHS_PER_PAGE = 6;
  const monthPageCount = Math.max(
    1,
    Math.ceil(months.length / MONTHS_PER_PAGE),
  );
  const safeMonthPage = Math.min(monthPage, monthPageCount - 1);
  const monthEnd = months.length - safeMonthPage * MONTHS_PER_PAGE;
  const visibleMonths = months.slice(
    Math.max(0, monthEnd - MONTHS_PER_PAGE),
    monthEnd,
  );

  const rankedCategories = [
    ...(categoriesStats?.byCategory ?? stats?.byCategory ?? []),
  ].sort((a, b) => b.value - a.value);
  const total =
    categoriesStats?.totals.month ?? stats?.totals.month ?? 0;
  const earliestMonth =
    months.find((month) => month.total > 0)?.month ??
    months[0]?.month ??
    currentMonth;

  const pager = (
    prevLabel: string,
    nextLabel: string,
    onOlder: () => void,
    onNewer: () => void,
    canGoOlder: boolean,
    canGoNewer: boolean,
  ) => (
    <div className="flex shrink-0 items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOlder}
        disabled={!canGoOlder}
        aria-label={prevLabel}
      >
        <Icon icon={ArrowLeft01Icon} className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onNewer}
        disabled={!canGoNewer}
        aria-label={nextLabel}
      >
        <Icon icon={ArrowRight01Icon} className="size-4" />
      </Button>
    </div>
  );

  const monthNav = (
    label: string,
    active: string,
    setMonth: (month: string) => void,
  ) => {
    const previous = shiftMonthKey(active, -1);
    const next = shiftMonthKey(active, 1);
    return pager(
      `Previous month for ${label}`,
      `Next month for ${label}`,
      () => {
        if (previous && previous >= earliestMonth) setMonth(previous);
      },
      () => {
        if (next && next <= currentMonth) setMonth(next);
      },
      Boolean(
        previous &&
          previous >= earliestMonth &&
          previous <= currentMonth,
      ),
      Boolean(next && next >= earliestMonth && next <= currentMonth),
    );
  };

  const MAX_DAILY_OFFSET = 7;
  const dailyStart = daily30[0]?.date;
  const dailyEnd = daily30[daily30.length - 1]?.date;
  const dailyHint =
    dailyStart && dailyEnd
      ? `${monthDayLabel(dailyStart)} – ${monthDayLabel(dailyEnd)} · stacked by category`
      : "Stacked by category";

  const dailyNav = pager(
    "Previous 30 days",
    "Next 30 days",
    () => setDayOffset((offset) => Math.min(MAX_DAILY_OFFSET, offset + 1)),
    () => setDayOffset((offset) => Math.max(0, offset - 1)),
    dayOffset < MAX_DAILY_OFFSET,
    dayOffset > 0,
  );

  const heatHint =
    heatFirst && heatLast
      ? `${monthDayLabel(heatFirst)} – ${monthDayLabel(heatLast)} · ${formatNumber(
          heatEntries,
        )} entries`
      : "No spending recorded yet";

  const heatNav = pager(
    "Previous heat range",
    "Next heat range",
    () => setHeatPage((page) => Math.min(maxHeatPage, page + 1)),
    () => setHeatPage((page) => Math.max(0, page - 1)),
    heatPage < maxHeatPage,
    heatPage > 0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          compact
          label="Spent"
          info="Total spending in the selected period."
          value={periodStats?.expense ?? 0}
          foot={periodStats?.label}
          spark={spark}
          sparkKey="expense"
          icon={ReceiptTextIcon}
          tone="orange"
        />
        <MetricCard
          compact
          label="Income"
          info="Total income recorded in the selected period."
          value={periodStats?.income ?? 0}
          foot={periodStats?.label}
          spark={spark}
          sparkKey="income"
          icon={Money03Icon}
          tone="emerald"
        />
        <MetricCard
          compact
          label="Net"
          info="Income minus spending for the selected period."
          value={periodStats?.net ?? 0}
          foot="Income minus spending"
          spark={spark}
          sparkKey="net"
          icon={ChartIncreaseIcon}
          tone="sky"
        />
        <MetricCard
          compact
          label="Entries"
          info="Number of transactions in the selected period."
          value={periodStats?.count ?? 0}
          money={false}
          foot={periodStats?.label}
          spark={spark}
          sparkKey="count"
          icon={Invoice02Icon}
          tone="violet"
        />
        <MetricCard
          compact
          label="Average day"
          info="Average spending per day in the selected period."
          value={periodStats?.avgExpensePerDay ?? 0}
          foot={`Per day · ${periodStats?.label ?? "selected period"}`}
          spark={spark}
          sparkKey="expense"
          icon={Calendar03Icon}
          tone="amber"
        />
        <MetricCard
          compact
          label="Largest single"
          info="Largest single expense in the selected period."
          value={periodStats?.largestExpense ?? 0}
          foot={`Biggest expense · ${periodStats?.label ?? "selected period"}`}
          spark={spark}
          sparkKey="expense"
          icon={Target01Icon}
          tone="rose"
        />
        <MetricCard
          compact
          label="Average entry"
          info="Average amount per expense entry in the selected period."
          value={averageEntry}
          foot={`Per entry · ${periodStats?.label ?? "selected period"}`}
          spark={spark}
          sparkKey="expense"
          icon={Invoice02Icon}
          tone="violet"
        />
        <MetricCard
          compact
          label="Peak spend"
          info="Highest spending day or bucket in the selected period."
          value={biggestSpark?.expense ?? 0}
          foot={biggestSpark?.label ?? "No spending"}
          spark={spark}
          sparkKey="expense"
          icon={ChartIncreaseIcon}
          tone="orange"
        />
      </div>

      <div className="relative left-1/2 grid w-[min(calc(100vw-2rem),1400px)] -translate-x-1/2 grid-cols-1 gap-4 pt-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionPanel
          title="Spending heat"
          hint={heatHint}
          action={heatNav}
          className="xl:col-span-3"
          bodyClassName="p-3"
        >
          <HeatmapInteractionProvider>
            <HeatmapInteractionBoundary>
              <div className="flex w-full flex-col gap-2.5">
                <HeatmapChart
                  className="w-full"
                  data={heat}
                  layout="fluid"
                  gap={3}
                >
                  <HeatmapCells />
                  <HeatmapXAxis minLabelGap={44} />
                  <HeatmapYAxis tickFilter="all" />
                  <HeatmapTooltip
                    formatLabel={(count, date) => {
                      const entries = entriesByDate.get(ymd(date)) ?? 0;
                      return `${display.formatMoney(count)} spent · ${formatNumber(entries)} ${
                        entries === 1 ? "entry" : "entries"
                      }`;
                    }}
                  />
                </HeatmapChart>
                <HeatmapLegend />
              </div>
            </HeatmapInteractionBoundary>
          </HeatmapInteractionProvider>
        </SectionPanel>

        <SectionPanel
          title="By weekday"
          hint={weekdayLabel}
          className="xl:col-span-1"
          bodyClassName="p-3"
          action={monthNav(
            "by weekday",
            weekdayMonthKey,
            setWeekdayMonth,
          )}
        >
          <RadialChart
            angleType="band"
            data={weekday}
            xDataKey="day"
            series={[{ dataKey: "value", label: "Spend" }]}
            maxValue="auto"
            maxWidth={250}
          >
            <RadialBar />
            <RadialAxis showCircle={false} />
            <RadialCenter>
              {({ totals, values, index, label }) => {
                const value =
                  index === null
                    ? totals.value ?? 0
                    : values.value ?? 0;
                return (
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">
                      {display.unit}
                    </p>
                    <p className="tnum mt-0.5 text-[11px] font-semibold leading-none">
                      {display.formatValue(value)}
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      {index === null ? "Total" : label}
                    </p>
                  </div>
                );
              }}
            </RadialCenter>
          </RadialChart>
        </SectionPanel>

        <SectionPanel
          title="Month by month"
          hint="Six months at a time"
          className="xl:col-span-2"
          bodyClassName="p-3"
          action={
            <div className="flex shrink-0 items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setMonthPage((page) =>
                    Math.min(monthPageCount - 1, page + 1),
                  )
                }
                disabled={safeMonthPage >= monthPageCount - 1}
                aria-label="View older months"
              >
                <Icon icon={ArrowLeft01Icon} className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setMonthPage((page) => Math.max(0, page - 1))
                }
                disabled={safeMonthPage === 0}
                aria-label="View newer months"
              >
                <Icon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </div>
          }
        >
          <BarChart
            data={visibleMonths}
            xDataKey="label"
            barGap={0.35}
            aspectRatio="2.2 / 1"
            margin={{ top: 8, right: 8, bottom: 40, left: 96 }}
          >
            <Grid horizontal />
            <YAxis formatValue={display.formatMoney} />
            <Bar dataKey="total" fill="var(--chart-1)" lineCap="round" />
            <BarXAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: "var(--chart-1)",
                  label: "Spend",
                  value: display.formatMoney(Number(point.total) || 0),
                },
              ]}
            />
          </BarChart>
        </SectionPanel>

        <SectionPanel
          title="Categories"
          hint={`${categoriesLabel}, share of spend`}
          className="xl:col-span-2"
          action={monthNav(
            "categories",
            categoriesMonthKey,
            setCategoriesMonth,
          )}
        >
          {rankedCategories.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
              <div className="flex justify-center">
                <PieChart
                  data={rankedCategories.map((entry) => ({
                    label: entry.label,
                    value: entry.value,
                    color: entry.color,
                  }))}
                  size={220}
                  innerRadius={62}
                  hoverOffset={8}
                >
                  <PieTicks
                    count={96}
                    strokeWidth={3}
                    sliceGap={2}
                    hoverEffect="slice"
                    fadedOpacity={0.25}
                  />
                  <PieCenter defaultLabel="Total">
                    {({ value, label }) => (
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">
                          {display.unit}
                        </p>
                        <AnimatedNumber
                          value={display.convert(value)}
                          duration={0.4}
                          startOnView={false}
                          format={formatDisplay}
                          className="mt-0.5 text-sm font-semibold leading-none text-foreground"
                        />
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {label}
                        </p>
                      </div>
                    )}
                  </PieCenter>
                </PieChart>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Key
                </p>
                <div className="mt-2 space-y-2">
                  {rankedCategories.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 text-[11px]"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: entry.color }}
                        />
                        <span className="truncate">{entry.label}</span>
                      </span>
                      <span className="tnum shrink-0 text-sm text-foreground">
                        {display.formatValue(entry.value)}{" "}
                        <span className="text-muted-foreground">{display.unit}</span>
                        <span className="ml-2 text-muted-foreground">
                          {Math.round(
                            (entry.value / Math.max(1, total)) * 100,
                          )}
                          %
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No spending recorded for this month yet.
            </p>
          )}
        </SectionPanel>

        <SectionPanel
          title="Daily rhythm"
          hint={dailyHint}
          className="xl:col-span-2"
          bodyClassName="p-3"
          action={dailyNav}
        >
          <BarChart
            data={daily30.map((point) => ({
              ...point,
              label: monthDayLabel(point.date),
            }))}
            xDataKey="label"
            stacked
            barGap={0.25}
            stackGap={1}
            aspectRatio="2.2 / 1"
            margin={{ top: 8, right: 8, bottom: 40, left: 96 }}
          >
            <Grid horizontal />
            <YAxis formatValue={display.formatMoney} />
            {expenseCategories.map((category) => (
              <Bar
                key={category.id}
                dataKey={category.id}
                fill={category.color}
                lineCap={2}
              />
            ))}
            <BarXAxis />
            <ChartTooltip
              rows={(point) =>
                expenseCategories.map((category) => ({
                  color: category.color,
                  label: category.label,
                  value: Number(point[category.id]) || 0,
                }))
                  .filter((entry) => entry.value > 0)
                  .map((entry) => ({
                    color: entry.color,
                    label: entry.label,
                    value: display.formatMoney(entry.value),
                  }))
              }
            />
          </BarChart>
        </SectionPanel>

        <SectionPanel
          title="Cumulative pace"
          hint={`${cumulativeLabel} · spend against a straight-line budget`}
          className="xl:col-span-2"
          bodyClassName="p-3"
          action={monthNav(
            "cumulative pace",
            cumulativeMonthKey,
            setCumulativeMonth,
          )}
        >
          <AreaChart
            data={cumulativeData}
            aspectRatio="2.2 / 1"
            margin={{ top: 8, right: 8, bottom: 40, left: 96 }}
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
              fillOpacity={0.28}
              strokeWidth={1.5}
              fadeBottom={40}
              fillFadeLeft
              fillFadeFromIndex={Math.max(
                0,
                Math.floor(cumulativeData.length * 0.72),
              )}
            />
            <YAxis formatValue={display.formatMoney} />
            <XAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: "var(--chart-1)",
                  label: "Spent",
                  value: display.formatMoney(Number(point.spent) || 0),
                },
                {
                  color: "var(--muted-foreground)",
                  label: "Budget pace",
                  value: display.formatMoney(Number(point.pace) || 0),
                },
              ]}
              dotHaloScale={0}
              dotHaloOpacity={0}
              dotStrokeWidth={0}
            />
          </AreaChart>
        </SectionPanel>


      </div>
    </div>
  );
}
