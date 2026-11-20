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
import { SectionInfo } from "@/components/section-info";
import { Panel, PanelHeader } from "@/components/panel";
import { useTransactionDialog } from "@/components/expense-dialog";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { useCategories } from "@/components/categories-provider";
import { useCurrency } from "@/components/currency-provider";
import { CURRENCY_META } from "@/lib/currencies";
import { daysInMonth, formatNumber, parseYmd, relativeDay, ymd } from "@/lib/format";
import { PERIOD_LABELS, PERIOD_OPTIONS } from "@/lib/periods";
import type { StatPeriod, Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

const SECTION_CARD = "flex flex-col border border-foreground/10 p-1";
const SECTION_HEADER = "px-3 pb-2 pt-2";
const SECTION_BODY =
  "flex-1 rounded-xl border border-foreground/5 bg-muted/25";

export default function DashboardPage() {
  const { version, openTransaction } = useTransactionDialog();
  const { expense: expenseCategories, categoryOf } = useCategories();
  const display = useCurrency();
  const formatDisplay = (value: number) =>
    display.currency !== "UGX"
      ? value.toLocaleString("en-US", {
          minimumFractionDigits: CURRENCY_META[display.currency].decimals,
          maximumFractionDigits: CURRENCY_META[display.currency].decimals,
        })
      : formatNumber(value);
  const axisValue = (value: number) =>
    display.currency !== "UGX"
      ? `${display.unit}${display.formatValue(value)}`
      : formatNumber(value);
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
          <h1 className="mt-2 flex items-center gap-3 font-display text-2xl leading-none tracking-[-0.03em] md:text-3xl">
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
                    className="size-5 md:size-6"
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
            className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-3 text-[13px] font-medium text-background transition-transform hover:bg-foreground/90 active:scale-[0.98]"
          >
            <Icon icon={PlusSignIcon} className="size-3.5 bg-transparent" /> Log expense
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="order-1 grid h-full auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:order-1 xl:col-span-5">
          <MetricCard
            compact
            label="Spent"
            info="Total spending in the selected period."
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
            info="Total income recorded in the selected period."
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
            info="Income minus spending for the selected period."
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
            info="Number of transactions in the selected period."
            value={periodStats?.count ?? 0}
            spark={periodStats?.spark ?? []}
            sparkKey="count"
            money={false}
            foot={periodStats?.label ?? PERIOD_LABELS[period]}
            icon={Invoice02Icon}
            tone="violet"
          />
        </aside>

        <Panel
          className={cn(
            "order-2 overflow-hidden xl:order-2 xl:col-span-7",
            SECTION_CARD,
          )}
        >
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                Month pace
                <SectionInfo label="Month pace">
                  How this month&apos;s spending is tracking against your
                  budget.
                </SectionInfo>
              </span>
            }
            className={SECTION_HEADER}
            action={
              stats?.month ? (
                <span className="text-[11px] text-muted-foreground">
                  {monthRangeLabel(stats.month)}
                </span>
              ) : null
            }
          />

          <div className={cn(SECTION_BODY, "p-4")}>
            <div className="mx-auto mt-0 grid w-full max-w-[720px] grid-cols-2 items-center gap-0 md:grid-cols-[minmax(0,1fr)_340px_minmax(0,1fr)]">
            <div className="order-1 col-span-2 flex justify-center md:order-2 md:col-span-1">
              <Gauge
                value={pct}
                centerValue={Math.round(pct)}
                suffix="%"
                defaultLabel="used"
                totalNotches={36}
                height={250}
                width={340}
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
              className="bg-transparent"
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
          </div>

        </Panel>

        <Panel className={cn("order-3 overflow-hidden xl:col-span-12", SECTION_CARD)}>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                Cash runway
                <SectionInfo label="Cash runway">
                  Your balance from the last payday through the next, with
                  history filled and the rest projected.
                </SectionInfo>
              </span>
            }
            action={
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
                {formatNumber(forecast?.daysToPayday ?? 0)} days to payday
              </span>
            }
            className={SECTION_HEADER}
          />
          <div className={cn(SECTION_BODY, "p-4")}>
          <div className="mt-0 grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col rounded-xl border border-foreground/10 bg-background/40 p-1">
              <div className="flex items-center gap-2 px-2 pb-1 pt-1.5">
                <Icon
                  icon={Money03Icon}
                  className="size-3.5 text-emerald-600 dark:text-emerald-400"
                />
                <p className="text-sm text-foreground">Safe to spend</p>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-lg border border-foreground/10 bg-muted/15 p-2.5">
                <span className="tnum inline-flex items-baseline gap-1.5 text-foreground">
                  <span className="text-sm font-semibold leading-none tracking-[-0.02em] text-muted-foreground">{display.unit}</span>
                  <AnimatedNumber
                    value={forecast?.safePerDayUgx ?? 0}
                    duration={0.6}
                    startOnView={false}
                    format={formatDisplay}
                    className="text-sm font-semibold leading-none tracking-[-0.02em]"
                  />
                  <span className="text-sm font-normal text-muted-foreground">/ day</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-foreground/10 bg-background/40 p-1">
              <div className="flex items-center gap-2 px-2 pb-1 pt-1.5">
                <Icon
                  icon={ChartIncreaseIcon}
                  className="size-3.5 text-sky-600 dark:text-sky-400"
                />
                <p className="text-sm text-foreground">Projected at payday</p>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-lg border border-foreground/10 bg-muted/15 p-2.5">
                <span className="tnum inline-flex items-baseline gap-1.5 text-foreground">
                  <span className="text-sm font-semibold leading-none tracking-[-0.02em] text-muted-foreground">{display.unit}</span>
                  <AnimatedNumber
                    value={forecast?.projectedBalanceUgx ?? 0}
                    duration={0.6}
                    startOnView={false}
                    format={formatDisplay}
                    className="text-sm font-semibold leading-none tracking-[-0.02em]"
                  />
                </span>
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-foreground/10 bg-background/40 p-1">
              <div className="flex items-center gap-2 px-2 pb-1 pt-1.5">
                <Icon
                  icon={Invoice02Icon}
                  className="size-3.5 text-amber-600 dark:text-amber-400"
                />
                <p className="text-sm text-foreground">MoMo fees this month</p>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-lg border border-foreground/10 bg-muted/15 p-2.5">
                <span className="tnum inline-flex items-baseline gap-1.5 text-foreground">
                  <span className="text-sm font-semibold leading-none tracking-[-0.02em] text-muted-foreground">{display.unit}</span>
                  <AnimatedNumber
                    value={stats?.momoFees.month ?? 0}
                    duration={0.6}
                    startOnView={false}
                    format={formatDisplay}
                    className="text-sm font-semibold leading-none tracking-[-0.02em]"
                  />
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4">
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
                formatValue={display.formatMoney}
              />
              <XAxis />
              <ChartTooltip
                rows={(point) => [
                  {
                    color: "var(--chart-1)",
                    label: point.projected ? "Projected balance" : "Balance",
                    value: display.formatMoney(Number(point.balance) || 0),
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
          </div>
        </Panel>

        <Panel className={cn("order-4 xl:col-span-5", SECTION_CARD)}>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                Accounts
                <SectionInfo label="Accounts">
                  Balances across your cash, bank and mobile money accounts.
                </SectionInfo>
              </span>
            }
            action={
              <Link
                href="/settings"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Manage <Icon icon={ArrowUpRight01Icon} className="size-3" />
              </Link>
            }
            hint={`${display.formatMoney(
              (stats?.accounts ?? []).reduce(
                (total, account) => total + account.balanceUgx,
                0,
              ),
            )} total`}
            className={SECTION_HEADER}
          />
          <div className={cn(SECTION_BODY, "divide-y divide-foreground/5 p-1")}>
            {(stats?.accounts ?? []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-2 py-2"
              >
                <span
                  className="grid size-7 place-items-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${entry.color} 14%, transparent)` }}
                >
                  <Icon icon={accountIcon(entry.type)} className="size-3.5" />
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

        <Panel className={cn("order-7 xl:col-span-5", SECTION_CARD)}>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                Recent activity
                <SectionInfo label="Recent activity">
                  Your latest transactions, newest first.
                </SectionInfo>
              </span>
            }
            action={
              <Link
                href="/expenses"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                All expenses <Icon icon={ArrowUpRight01Icon} className="size-3" />
              </Link>
            }
            className={SECTION_HEADER}
          />
          <ul className={cn(SECTION_BODY, "divide-y divide-foreground/5 p-1")}>
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
                    className="flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg"
                      style={{ background: `color-mix(in oklab, ${category.color} 14%, transparent)` }}
                    >
                      <Icon
                        icon={transfer ? ArrowLeftRightIcon : category.icon}
                        className="size-3.5"
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

        <Panel className={cn("order-5 xl:col-span-7", SECTION_CARD)}>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                Categories
                <SectionInfo label="Categories">
                  How this month&apos;s spending splits across categories.
                </SectionInfo>
              </span>
            }
            className={SECTION_HEADER}
            action={
              <span className="text-[11px] text-muted-foreground">
                {stats?.monthLabel ?? "This month"}, share of spend
              </span>
            }
          />
          <div className={cn(SECTION_BODY, "p-4")}>
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
                        <p className="text-[10px] text-muted-foreground">{display.unit}</p>
                        <AnimatedNumber
                          value={value}
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
                        {display.formatValue(entry.value)}{" "}
                        <span className="text-muted-foreground">
                          {display.unit}
                        </span>
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
          </div>
        </Panel>

        <Panel className={cn("order-6 flex flex-col xl:col-span-7", SECTION_CARD)}>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                Daily flow
                <SectionInfo label="Daily flow">
                  Spending for each of the last 30 days, stacked by category.
                </SectionInfo>
              </span>
            }
            className={SECTION_HEADER}
          />
          <div className={cn(SECTION_BODY, "flex flex-1 flex-col p-3")}>
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
              <YAxis formatValue={axisValue} />
              {expenseCategories.map((category) => (
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
                  const rows = expenseCategories.map((category) => ({
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
                                {display.formatMoney(entry.value)}
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
            {expenseCategories.map((category) => (
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

function monthRangeLabel(month: string) {
  const days = daysInMonth(month);
  const start = parseYmd(`${month}-01`);
  const end = parseYmd(`${month}-${String(days).padStart(2, "0")}`);
  const format = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${format(start)} – ${format(end)}`;
}

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
