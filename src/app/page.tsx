"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRightIcon,
  ArrowUpRight01Icon,
  ChartIncreaseIcon,
  Coffee01Icon,
  Invoice02Icon,
  Money03Icon,
  Moon02Icon,
  PlusSignIcon,
  ReceiptTextIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Gauge,
  Grid,
  PieCenter,
  PieChart,
  PieTicks,
  XAxis,
  YAxis,
} from "@/components/charts";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MetricCard } from "@/components/metric-card";
import { PageLoader } from "@/components/page-loader";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/motion/combobox";
import { accountIcon } from "@/components/account-select";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { Panel, PanelHeader } from "@/components/panel";
import { useTransactionDialog } from "@/components/expense-dialog";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { daysInMonth, formatNumber, parseYmd, relativeDay, ymd } from "@/lib/format";
import { PERIOD_LABELS, PERIOD_OPTIONS } from "@/lib/periods";
import type { StatPeriod, Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { version, openTransaction } = useTransactionDialog();
  const [period, setPeriod] = useState<StatPeriod>("30d");
  const { data: stats, loading } = useApi<Stats>(
    `/api/stats?period=${period}&v=${version}`,
  );
  const now = useNow();
  const today = now ? ymd(now) : "";
  const periodStats = stats?.period;

  const forecastData = useMemo(
    () =>
      (stats?.forecast.points ?? []).map((point) => ({
        date: parseYmd(point.date),
        balance: point.balance,
        projected: point.projected,
      })),
    [stats],
  );

  const historyEndIndex = Math.max(
    0,
    (stats?.forecast.points ?? []).filter((point) => !point.projected).length - 1,
  );

  const forecast = stats?.forecast;
  const budget = stats?.totals.budget ?? 0;
  const spent = stats?.totals.month ?? 0;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = Math.max(0, budget - spent);
  const trendStatus: "neutral" | "danger" | "success" =
    !stats || stats.vsLastMonth === 0
      ? "neutral"
      : stats.vsLastMonth > 0
        ? "danger"
        : "success";
  const dayOfMonth = stats?.daily.length ?? 0;
  const daysInMonthCount = stats ? daysInMonth(stats.month) : 0;
  const categoryTotals = (stats?.byCategory ?? []).filter(
    (entry) => entry.value > 0,
  );
  const daily30 = stats?.daily30 ?? [];

  if (loading && !stats) {
    return <PageLoader variant="dot-matrix" size={26} label="Crunching the numbers" />;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[13px] text-muted-foreground">
            {now ? (
              <>
                {now.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                <span className="tnum">
                  {" "}
                  · <LiveClock />
                </span>
              </>
            ) : (
              "\u00a0"
            )}
          </p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-5xl leading-none md:text-[56px]">
            {now ? (
              <>
                {greeting(now.getHours())}
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex",
                    now.getHours() < 12
                      ? "text-amber-500"
                      : now.getHours() < 18
                        ? "text-orange-500"
                        : "text-indigo-400",
                  )}
                >
                  <Icon
                    icon={
                      now.getHours() < 12
                        ? Coffee01Icon
                        : now.getHours() < 18
                          ? Sun03Icon
                          : Moon02Icon
                    }
                    className="size-8 md:size-9"
                  />
                </span>
              </>
            ) : (
              "Hello"
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Combobox
            value={period}
            onValueChange={(value) => setPeriod(value as StatPeriod)}
            className="w-36 shrink-0"
          >
            <ComboboxTrigger className="h-9 min-w-0 rounded-full px-3">
              <ComboboxInput
                aria-label="Timeframe"
                placeholder="Timeframe"
                className="h-9 text-[13px]"
                showIcon={false}
              />
            </ComboboxTrigger>
            <ComboboxContent className="w-52 rounded-2xl">
              <ComboboxList ariaLabel="Timeframe" className="p-2">
                <ComboboxEmpty>No timeframes.</ComboboxEmpty>
                {PERIOD_OPTIONS.map((option) => (
                  <ComboboxItem
                    key={option.value}
                    value={option.value}
                    textValue={option.label}
                  >
                    {option.label}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <button
            type="button"
            onClick={() => openTransaction(undefined, "expense")}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-2 text-[13px] font-medium text-background transition-transform hover:bg-foreground/90 active:scale-[0.98]"
          >
            <Icon icon={PlusSignIcon} className="size-4" /> Log expense
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="order-1 grid h-full auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:order-2 xl:col-span-5">
          <MetricCard
            compact
            label="Spent"
            value={periodStats?.expense ?? 0}
            spark={periodStats?.spark ?? []}
            sparkKey="expense"
            foot={periodStats?.label ?? PERIOD_LABELS[period]}
            icon={ReceiptTextIcon}
            tone="orange"
          />
          <MetricCard
            compact
            label="Income"
            value={periodStats?.income ?? 0}
            spark={periodStats?.spark ?? []}
            sparkKey="income"
            foot={periodStats?.label ?? PERIOD_LABELS[period]}
            icon={Money03Icon}
            tone="emerald"
          />
          <MetricCard
            compact
            label="Net"
            value={periodStats?.net ?? 0}
            spark={periodStats?.spark ?? []}
            sparkKey="net"
            foot={periodStats?.label ?? PERIOD_LABELS[period]}
            icon={ChartIncreaseIcon}
            tone="sky"
          />
          <MetricCard
            compact
            label="Entries"
            value={periodStats?.count ?? 0}
            spark={periodStats?.spark ?? []}
            sparkKey="count"
            money={false}
            foot={periodStats?.label ?? PERIOD_LABELS[period]}
            icon={Invoice02Icon}
            tone="violet"
          />
        </aside>

        <Panel className="order-2 overflow-hidden p-5 xl:order-1 xl:col-span-7">
          <PanelHeader
            title="Month pace"
            hint={
              <span>
                Total balance{" "}
                <span className="tnum font-medium text-foreground">
                  UGX {formatNumber(forecast?.liquidBalanceUgx ?? 0)}
                </span>
              </span>
            }
            action={
              <MonthCalendar
                month={stats?.month}
                day={dayOfMonth}
                days={daysInMonthCount}
              />
            }
            className="p-0"
          />

          <div className="mt-0 grid grid-cols-2 items-center gap-3 md:grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)]">
            <div className="order-1 col-span-2 flex justify-center md:order-2 md:col-span-1">
              <Gauge
                value={pct}
                centerValue={Math.round(pct)}
                suffix="%"
                defaultLabel="used"
                totalNotches={36}
                height={170}
                width={240}
                activeFill="var(--primary)"
                inactiveFill="var(--muted)"
                needle="line"
              />
            </div>

            <div className="order-2 flex min-h-[84px] flex-col items-center justify-center gap-1.5 py-3 text-center md:order-1">
              <span className="text-sm capitalize text-muted-foreground">
                Spent
              </span>
              <Money value={spent} size="sm" />
            </div>
            <div className="order-3 flex min-h-[84px] flex-col items-center justify-center gap-1.5 py-3 text-center">
              <span className="text-sm capitalize text-muted-foreground">
                Left
              </span>
              <Money value={remaining} size="sm" />
            </div>
          </div>

          <div className="mt-0 flex justify-center">
            <AnimatedBadge
              status={trendStatus}
              size="sm"
              contentKey={stats?.vsLastMonth ?? 0}
            >
              {Math.abs(stats?.vsLastMonth ?? 0)}%{" "}
              {stats && stats.vsLastMonth > 0
                ? "more"
                : stats && stats.vsLastMonth < 0
                  ? "less"
                  : ""}{" "}
              vs last month
            </AnimatedBadge>
          </div>

        </Panel>

        <Panel className="order-3 overflow-hidden p-5 xl:col-span-12">
          <PanelHeader
            title="Cash runway"
            hint="Previous payday to next payday · history filled, projection dashed at your recent burn rate"
            action={
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
                {formatNumber(forecast?.daysToPayday ?? 0)} days to payday
              </span>
            }
            className="p-0"
          />
          <div className="mt-8 grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="py-3 first:pt-0 last:pb-0 sm:min-h-[76px] sm:px-4 sm:py-1 sm:first:pl-0 sm:last:pr-0">
              <div className="flex items-center gap-2">
                <Icon
                  icon={Money03Icon}
                  className="size-4 text-emerald-600 dark:text-emerald-400"
                />
                <p className="text-sm text-foreground">Safe to spend</p>
              </div>
              <span className="tnum mt-1 inline-flex items-baseline gap-1.5 text-foreground">
                <span className="text-sm font-semibold leading-none tracking-[-0.02em] text-muted-foreground">UGX</span>
                <AnimatedNumber
                  value={forecast?.safePerDayUgx ?? 0}
                  duration={0.6}
                  startOnView={false}
                  format={formatNumber}
                  className="text-sm font-semibold leading-none tracking-[-0.02em]"
                />
                <span className="text-sm font-normal text-muted-foreground">/ day</span>
              </span>
            </div>
            <div className="py-3 first:pt-0 last:pb-0 sm:min-h-[76px] sm:px-4 sm:py-1 sm:first:pl-0 sm:last:pr-0">
              <div className="flex items-center gap-2">
                <Icon
                  icon={ChartIncreaseIcon}
                  className="size-4 text-sky-600 dark:text-sky-400"
                />
                <p className="text-sm text-foreground">Projected at payday</p>
              </div>
              <span className="tnum mt-1 inline-flex items-baseline gap-1.5 text-foreground">
                <span className="text-sm font-semibold leading-none tracking-[-0.02em] text-muted-foreground">UGX</span>
                <AnimatedNumber
                  value={forecast?.projectedBalanceUgx ?? 0}
                  duration={0.6}
                  startOnView={false}
                  format={formatNumber}
                  className="text-sm font-semibold leading-none tracking-[-0.02em]"
                />
              </span>
            </div>
            <div className="py-3 first:pt-0 last:pb-0 sm:min-h-[76px] sm:px-4 sm:py-1 sm:first:pl-0 sm:last:pr-0">
              <div className="flex items-center gap-2">
                <Icon
                  icon={Invoice02Icon}
                  className="size-4 text-amber-600 dark:text-amber-400"
                />
                <p className="text-sm text-foreground">MoMo fees this month</p>
              </div>
              <span className="tnum mt-1 inline-flex items-baseline gap-1.5 text-foreground">
                <span className="text-sm font-semibold leading-none tracking-[-0.02em] text-muted-foreground">UGX</span>
                <AnimatedNumber
                  value={stats?.momoFees.month ?? 0}
                  duration={0.6}
                  startOnView={false}
                  format={formatNumber}
                  className="text-sm font-semibold leading-none tracking-[-0.02em]"
                />
              </span>
            </div>
          </div>
          <div className="mt-1">
            <AreaChart
              data={forecastData}
              aspectRatio="2.6 / 1"
              margin={{ top: 16, right: 32, bottom: 44, left: 112 }}
            >
              <Grid horizontal />
              <Area
                dataKey="balance"
                fill="var(--chart-1)"
                stroke="var(--chart-1)"
                fillOpacity={0.18}
                strokeWidth={1.5}
                fadeBottom={75}
                fillFadeFromIndex={historyEndIndex}
                fillFadeLeft
                dashFromIndex={historyEndIndex}
              />
              <YAxis
                numTicks={5}
                formatLargeNumbers={false}
                formatValue={(value) => `UGX ${formatNumber(value)}`}
              />
              <XAxis />
              <ChartTooltip
                rows={(point) => [
                  {
                    color: "var(--chart-1)",
                    label: point.projected ? "Projected balance" : "Balance",
                    value: `UGX ${formatNumber(Number(point.balance) || 0)}`,
                  },
                ]}
                dotHaloScale={0}
                dotHaloOpacity={0}
                dotStrokeWidth={0}
              />
            </AreaChart>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]/40" />
                Balance history
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-t border-dashed border-[var(--chart-1)]" />
                Projected to next payday
              </span>
            </div>
          </div>
        </Panel>

        <Panel className="order-4 p-5 xl:col-span-5">
          <PanelHeader
            title="Accounts"
            hint="Cash, bank and mobile money"
            action={
              <Link
                href="/settings"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Manage <Icon icon={ArrowUpRight01Icon} className="size-3.5" />
              </Link>
            }
            className="p-0 pb-4"
          />
          <div className="space-y-1.5">
            {(stats?.accounts ?? []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/20 px-3 py-2"
              >
                <span
                  className="grid size-8 place-items-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${entry.color} 14%, transparent)` }}
                >
                  <Icon icon={accountIcon(entry.type)} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{entry.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {entry.provider ?? entry.type}
                  </p>
                </div>
                <Money value={entry.balanceUgx} size="sm" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="order-7 p-5 xl:col-span-5">
          <PanelHeader
            title="Recent activity"
            hint="Latest entries, newest first"
            action={
              <Link
                href="/expenses"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                All expenses <Icon icon={ArrowUpRight01Icon} className="size-3.5" />
              </Link>
            }
            className="p-0 pb-4"
          />
          <ul className="divide-y divide-border/70">
            {(stats?.recent ?? []).map((transaction) => {
              const category = categoryOf(transaction.category || "other");
              const transfer = transaction.type === "transfer";
              const description =
                transaction.note ||
                (transfer ? "Transfer" : category.label);
              return (
                <li key={transaction.id}>
                  <button
                    type="button"
                    onClick={() => openTransaction(transaction)}
                    className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg"
                      style={{ background: `color-mix(in oklab, ${category.color} 14%, transparent)` }}
                    >
                      <Icon
                        icon={transfer ? ArrowLeftRightIcon : category.icon}
                        className="size-4"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{description}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {relativeDay(transaction.spentOn, today)},{" "}
                        {transfer ? "Transfer" : category.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      {!transfer ? (
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            transaction.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {transaction.type === "income" ? "+" : "−"}
                        </span>
                      ) : null}
                      <Money value={transaction.amountUgx} size="sm" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel className="order-5 p-5 xl:col-span-7">
          <PanelHeader
            title="Categories"
            hint={`${stats?.monthLabel ?? "This month"}, share of spend`}
            className="p-0 pb-4"
          />
          {categoryTotals.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
              <div className="flex justify-center">
                <PieChart
                  data={categoryTotals.map((entry) => ({
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
                        <p className="text-[10px] text-muted-foreground">UGX</p>
                        <AnimatedNumber
                          value={value}
                          duration={0.4}
                          startOnView={false}
                          format={formatNumber}
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
                  {categoryTotals.map((entry) => (
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
                        {formatNumber(entry.value)}{" "}
                        <span className="text-muted-foreground">UGX</span>
                        <span className="ml-2 text-muted-foreground">
                          {Math.round((entry.value / Math.max(1, spent)) * 100)}%
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
        </Panel>

        <Panel className="order-6 flex flex-col p-5 xl:col-span-7">
          <PanelHeader
            title="Daily flow"
            hint="Last 30 days, by category"
            className="p-0 pb-4"
          />
          <div className="relative min-h-[280px] flex-1">
            <BarChart
              data={daily30.map((point) => ({
                ...point,
                label: parseYmd(point.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              }))}
              xDataKey="label"
              stacked
              className="absolute inset-0"
              aspectRatio="auto"
              barGap={0.25}
              stackGap={1}
              margin={{ top: 8, right: 8, bottom: 44, left: 56 }}
            >
              <Grid horizontal />
              <YAxis formatValue={(value) => formatNumber(value)} />
              {CATEGORIES.map((category) => (
                <Bar
                  key={category.id}
                  dataKey={category.id}
                  fill={category.color}
                  lineCap={2}
                />
              ))}
              <BarXAxis maxLabels={6} />
              <ChartTooltip
                content={({ point }) => {
                  const rows = CATEGORIES.map((category) => ({
                    ...category,
                    value: Number(point[category.id]) || 0,
                  })).filter((entry) => entry.value > 0);

                  return (
                    <div className="w-max px-3.5 py-3">
                      <p className="mb-2 text-[11px] font-medium text-chart-tooltip-muted">
                        {String(point.label ?? "")}
                      </p>
                      {rows.length > 0 ? (
                        <div className="space-y-1.5">
                          {rows.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between gap-6 whitespace-nowrap"
                            >
                              <span className="flex items-center gap-2 text-sm text-chart-tooltip-muted">
                                <span
                                  className="size-2 shrink-0 rounded-full"
                                  style={{ background: entry.color }}
                                />
                                {entry.label}
                              </span>
                              <span className="tnum text-right text-sm font-medium text-chart-tooltip-foreground">
                                <span className="text-chart-tooltip-muted">UGX</span>{" "}
                                {formatNumber(entry.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="whitespace-nowrap text-sm text-chart-tooltip-muted">
                          No spending
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </BarChart>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            {CATEGORIES.map((category) => (
              <span
                key={category.id}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: category.color }}
                />
                {category.label}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function greeting(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function LiveClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const date = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      setTime(
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
      );
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <span className="tnum">{time ?? "--:--:--"}</span>;
}

function MonthCalendar({
  month,
  day,
  days,
}: {
  month?: string;
  day: number;
  days: number;
}) {
  const firstWeekday = month ? parseYmd(`${month}-01`).getDay() : 0;
  const current = Math.min(Math.max(day, 0), days);

  return (
    <div
      className="w-[80px] shrink-0 select-none"
      role="img"
      aria-label={`Day ${current} of ${days} this month`}
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-medium text-muted-foreground">
        {WEEKDAYS.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, index) => (
          <span key={`leading-${index}`} className="size-2" />
        ))}
        {Array.from({ length: days }).map((_, index) => {
          const value = index + 1;
          return (
            <span
              key={value}
              className={cn(
                "size-2 rounded-full",
                value < current && "bg-foreground/30",
                value === current && "bg-primary",
                value > current && "bg-muted",
              )}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-[9px] text-muted-foreground">
        Day {current} of {days}
      </p>
    </div>
  );
}
