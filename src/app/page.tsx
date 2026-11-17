"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRightIcon,
  ArrowUpRight01Icon,
  PlusSignIcon,
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
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Loader } from "@/components/motion/loader";
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
import { categoryOf } from "@/lib/categories";
import { daysInMonth, formatNumber, parseYmd, relativeDay, ymd } from "@/lib/format";
import { PERIOD_LABELS, PERIOD_OPTIONS } from "@/lib/periods";
import type { PeriodStats, StatPeriod, Stats } from "@/lib/types";
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

  const areaData = useMemo(
    () =>
      (stats?.cumulative ?? []).map((point) => ({
        date: parseYmd(point.date),
        spent: point.spent,
        pace: point.pace,
      })),
    [stats],
  );

  const forecastData = useMemo(
    () =>
      (stats?.forecast.points ?? []).map((point) => ({
        date: parseYmd(point.date),
        balance: point.balance,
      })),
    [stats],
  );

  const forecast = stats?.forecast;
  const budget = stats?.totals.budget ?? 0;
  const spent = stats?.totals.month ?? 0;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = Math.max(0, budget - spent);
  const over = spent > budget;
  const dayOfMonth = stats?.daily.length ?? 0;
  const daysInMonthCount = stats ? daysInMonth(stats.month) : 0;
  const paceNow = stats?.cumulative.at(-1)?.pace ?? 0;
  const paceDelta = spent - paceNow;

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
              ? now.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
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
          <Combobox
            value={period}
            onValueChange={(value) => setPeriod(value as StatPeriod)}
            className="w-44 shrink-0"
          >
            <ComboboxTrigger className="h-9 min-w-0 rounded-full px-3">
              <ComboboxInput
                aria-label="Timeframe"
                placeholder="Timeframe"
                className="h-9 text-[13px]"
                showIcon={false}
              />
            </ComboboxTrigger>
            <ComboboxContent className="w-52 rounded-xl">
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
            className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Icon icon={PlusSignIcon} className="size-4" /> Log expense
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard
          label="Spent"
          value={periodStats?.expense ?? 0}
          spark={periodStats?.spark ?? []}
          sparkKey="expense"
          foot={periodStats?.label ?? PERIOD_LABELS[period]}
        />
        <StatCard
          label="Income"
          value={periodStats?.income ?? 0}
          spark={periodStats?.spark ?? []}
          sparkKey="income"
          foot={periodStats?.label ?? PERIOD_LABELS[period]}
        />
        <StatCard
          label="Net"
          value={periodStats?.net ?? 0}
          spark={periodStats?.spark ?? []}
          sparkKey="net"
          foot={periodStats?.label ?? PERIOD_LABELS[period]}
        />
        <StatCard
          label="Entries"
          value={periodStats?.count ?? 0}
          spark={periodStats?.spark ?? []}
          sparkKey="count"
          money={false}
          foot={periodStats?.label ?? PERIOD_LABELS[period]}
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Panel className="col-span-12 overflow-hidden p-6">
          <div className="grid gap-6 md:min-h-[27rem] md:grid-cols-[minmax(0,1fr)_1px_minmax(0,2fr)]">
            <div className="flex flex-col justify-start gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <Money value={spent} size="md" className="mt-1" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Left</p>
                  <Money value={remaining} size="md" className="mt-1" />
                </div>
              </div>
              <div className="flex flex-col items-center">
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
            </div>

            <div className="h-px w-full self-center bg-border/70 md:h-auto md:w-px md:self-stretch md:my-3" />

            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Month pace
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Spend against a straight-line budget · Day {dayOfMonth} of {daysInMonthCount}
                  </p>
                </div>
                <AnimatedBadge
                  status={
                    stats && stats.vsLastMonth !== 0
                      ? stats.vsLastMonth > 0
                        ? "danger"
                        : "success"
                      : "neutral"
                  }
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

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="text-[11px] text-muted-foreground">Spent</span>
                  <span className="tnum text-sm font-semibold">
                    {formatNumber(spent)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">UGX</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground">Budget pace</span>
                  <span className="tnum text-sm font-semibold">
                    {formatNumber(paceNow)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">UGX</span>
                  </span>
                </div>
                <AnimatedBadge
                  className="ml-auto"
                  status={paceDelta > 0 ? "danger" : paceDelta < 0 ? "success" : "neutral"}
                  size="sm"
                  contentKey={paceDelta}
                >
                  {paceDelta === 0
                    ? "On pace"
                    : `${paceDelta > 0 ? "Ahead" : "Under"} by ${formatNumber(Math.abs(paceDelta))} UGX`}
                </AnimatedBadge>
              </div>

              <div className="mt-4">
                <AreaChart
                  data={areaData}
                  aspectRatio="1.8 / 1"
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
                  <ChartTooltip dotHaloScale={0} dotHaloOpacity={0} dotStrokeWidth={0} />
                </AreaChart>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Panel className="col-span-12 overflow-hidden p-6 xl:col-span-8">
          <PanelHeader
            title="Safe to spend"
            hint="Per day until payday, after your buffer"
            action={
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                {forecast?.daysToPayday ?? 0} days to payday
              </span>
            }
            className="p-0"
          />
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Safe to spend / day</p>
              <div className="mt-1">
                <span className="tnum inline-flex items-baseline gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">UGX</span>
                  <AnimatedNumber
                    value={forecast?.safePerDayUgx ?? 0}
                    duration={0.6}
                    startOnView={false}
                    format={formatNumber}
                    className="text-4xl font-semibold leading-none tracking-[-0.03em]"
                  />
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Projected at payday
                <Money value={forecast?.projectedBalanceUgx ?? 0} size="sm" />
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              MoMo fees this month{" "}
              <span className="tnum text-foreground">
                {formatNumber(stats?.momoFees.month ?? 0)} UGX
              </span>
            </p>
          </div>
          <div className="mt-3">
            <AreaChart
              data={forecastData}
              aspectRatio="3 / 1"
              margin={{ top: 10, right: 12, bottom: 30, left: 72 }}
            >
              <Grid horizontal />
              <Area
                dataKey="balance"
                fill="var(--chart-1)"
                stroke="var(--chart-1)"
                fillOpacity={0.28}
                strokeWidth={2.2}
                fadeBottom={40}
              />
              <YAxis formatValue={(value) => formatNumber(value)} />
              <XAxis />
              <ChartTooltip dotHaloScale={0} dotHaloOpacity={0} dotStrokeWidth={0} />
            </AreaChart>
          </div>
        </Panel>

        <Panel className="col-span-12 p-6 xl:col-span-4">
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
          <div className="space-y-2">
            {(stats?.accounts ?? []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"
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
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Panel className="col-span-12 p-6 xl:col-span-7">
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
                    className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-muted/50"
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

        <Panel className="col-span-12 p-6 xl:col-span-5">
          <PanelHeader
            title="Categories"
            hint={`${stats?.monthLabel ?? "This month"}, share of spend`}
            className="p-0 pb-4"
          />
          <div className="space-y-4">
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
        </Panel>
      </div>

      <Panel className="p-6">
        <PanelHeader title="Months" hint="Last eight months" className="p-0 pb-4" />
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
      </Panel>

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
  money = true,
  sparkKey = "expense",
}: {
  label: string;
  value: number;
  spark: PeriodStats["spark"];
  foot: string;
  money?: boolean;
  sparkKey?: "expense" | "income" | "net" | "count";
}) {
  return (
    <Panel className="p-5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <div className="mt-2">
        {money ? (
          <span className="tnum inline-flex items-baseline gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">UGX</span>
            <AnimatedNumber
              value={value}
              duration={0.6}
              startOnView={false}
              format={formatNumber}
              className="text-2xl font-semibold leading-none tracking-[-0.02em]"
            />
          </span>
        ) : (
          <AnimatedNumber
            value={value}
            duration={0.6}
            startOnView={false}
            format={(n) => String(Math.round(n))}
            className="text-2xl font-semibold leading-none tracking-[-0.02em]"
          />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{foot}</p>
      <div className="mt-3">
        <AreaSparkline
          data={spark.length > 1 ? spark : [...spark, ...spark]}
          dataKey={sparkKey}
          height={40}
          color="var(--chart-1)"
          fill="gradient"
        />
      </div>
    </Panel>
  );
}
