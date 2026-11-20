"use client";

import { useMemo } from "react";
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
import { useCategories } from "@/components/categories-provider";
import { useCurrency } from "@/components/currency-provider";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useNow } from "@/lib/use-now";
import { addDays, parseYmd, ymd } from "@/lib/format";
import type {
  BudgetProgress,
  Debt,
  Goal,
  PlanActivity,
  RecurringRule,
} from "@/lib/types";

type PlanChartSection = "goals" | "debts" | "recurring" | "budgets" | "activity";

const COLORS = {
  sky: "oklch(0.62 0.19 259)",
  rose: "oklch(0.645 0.246 16)",
  emerald: "oklch(0.696 0.17 162)",
  violet: "oklch(0.606 0.25 292)",
  amber: "oklch(0.75 0.16 75)",
  muted: "oklch(0.72 0.02 275)",
};

function shortDate(value: string | Date) {
  const date = typeof value === "string" ? parseYmd(value) : value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-muted/10 p-3">
      <div className="mb-2 flex items-start justify-between gap-3 px-1">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-right text-[10px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function ChartGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 lg:grid-cols-2">{children}</div>;
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-12 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function PlanSectionCharts({
  section,
  goals,
  debts,
  recurring,
  budgets,
  activity,
  allActivity,
}: {
  section: PlanChartSection;
  goals: Goal[];
  debts: Debt[];
  recurring: RecurringRule[];
  budgets: BudgetProgress[];
  activity: PlanActivity[];
  allActivity: PlanActivity[];
}) {
  const display = useCurrency();
  const { categoryOf } = useCategories();
  const now = useNow();
  const today = now ? ymd(now) : ymd(new Date());

  const goalTrend = useMemo(() => {
    const entries = allActivity
      .filter((entry) => entry.kind === "goal-contribution")
      .sort((a, b) => a.date.localeCompare(b.date));
    const current = goals.reduce((total, goal) => total + goal.savedUgx, 0);
    if (entries.length === 0) {
      return [
        { date: addDays(parseYmd(today), -30), saved: current },
        { date: parseYmd(today), saved: current },
      ];
    }
    const contributed = entries.reduce(
      (total, entry) => total + entry.amountUgx,
      0,
    );
    let running = Math.max(0, current - contributed);
    const points = entries.map((entry) => {
      running = Math.max(0, running + entry.amountUgx);
      return { date: parseYmd(entry.date), saved: running };
    });
    return [...points, { date: parseYmd(today), saved: current }];
  }, [allActivity, goals, today]);

  const goalBars = useMemo(
    () =>
      [...goals]
        .sort((a, b) => b.targetUgx - a.targetUgx)
        .map((goal) => ({
          name: goal.name,
          saved: goal.savedUgx,
          target: goal.targetUgx,
        })),
    [goals],
  );

  const debtBars = useMemo(() => {
    const rows = new Map<string, { name: string; borrowed: number; lent: number }>();
    for (const debt of debts) {
      const row = rows.get(debt.counterparty) ?? {
        name: debt.counterparty,
        borrowed: 0,
        lent: 0,
      };
      row[debt.direction] += debt.balanceUgx;
      rows.set(debt.counterparty, row);
    }
    return Array.from(rows.values()).sort(
      (a, b) => b.borrowed + b.lent - (a.borrowed + a.lent),
    );
  }, [debts]);

  const debtTrend = useMemo(() => {
    const borrowed = debts
      .filter((debt) => debt.direction === "borrowed")
      .reduce((total, debt) => total + debt.balanceUgx, 0);
    const lent = debts
      .filter((debt) => debt.direction === "lent")
      .reduce((total, debt) => total + debt.balanceUgx, 0);
    const current = borrowed - lent;
    const payments = allActivity
      .filter((entry) => entry.kind === "debt-payment")
      .sort((a, b) => a.date.localeCompare(b.date));
    if (payments.length === 0) {
      return [
        { date: addDays(parseYmd(today), -30), net: current },
        { date: parseYmd(today), net: current },
      ];
    }
    const direction = new Map(debts.map((debt) => [debt.id, debt.direction]));
    const deltas = payments.map((entry) => ({
      date: entry.date,
      delta:
        direction.get(entry.refId) === "lent"
          ? entry.amountUgx
          : -entry.amountUgx,
    }));
    let running = current - deltas.reduce((total, entry) => total + entry.delta, 0);
    const points = deltas.map((entry) => {
      running += entry.delta;
      return { date: parseYmd(entry.date), net: running };
    });
    return [...points, { date: parseYmd(today), net: current }];
  }, [allActivity, debts, today]);

  const recurringLoad = useMemo(() => {
    const rows = new Map<string, { label: string; amount: number; color: string }>();
    for (const rule of recurring) {
      if (!rule.enabled) continue;
      const multiplier =
        rule.frequency === "daily" ? 30 : rule.frequency === "weekly" ? 4 : 1;
      const label =
        rule.type === "transfer"
          ? "Transfers"
          : rule.type === "income"
            ? "Income"
            : categoryOf(rule.category).label;
      const row = rows.get(label) ?? {
        label,
        amount: 0,
        color:
          rule.type === "income"
            ? COLORS.emerald
            : rule.type === "transfer"
              ? COLORS.sky
              : categoryOf(rule.category).color,
      };
      row.amount += rule.amountUgx * multiplier;
      rows.set(label, row);
    }
    return Array.from(rows.values()).sort((a, b) => b.amount - a.amount);
  }, [categoryOf, recurring]);

  const upcoming = useMemo(() => {
    const horizon = addDays(parseYmd(today), 56);
    const buckets = Array.from({ length: 8 }, (_, index) => ({
      label: index === 0 ? "This week" : `Week ${index + 1}`,
      expense: 0,
      income: 0,
    }));
    for (const rule of recurring) {
      if (!rule.enabled) continue;
      let date = parseYmd(rule.nextOn);
      let guard = 0;
      while (date <= horizon && guard < 24) {
        const days = Math.floor(
          (date.getTime() - parseYmd(today).getTime()) / 86_400_000,
        );
        const bucket = Math.min(7, Math.max(0, Math.floor(days / 7)));
        if (rule.type === "income") buckets[bucket].income += rule.amountUgx;
        else buckets[bucket].expense += rule.amountUgx;
        date = advance(date, rule.frequency);
        guard += 1;
      }
    }
    return buckets;
  }, [recurring, today]);

  const budgetBars = useMemo(
    () =>
      budgets
        .filter((budget) => budget.categoryId !== "all")
        .map((budget) => ({
          name: budget.name,
          spent: budget.spentUgx,
          limit: budget.limitUgx,
        })),
    [budgets],
  );

  const overallBudget = budgets.find((budget) => budget.categoryId === "all");
  const overallPct = overallBudget
    ? Math.min(100, (overallBudget.spentUgx / Math.max(1, overallBudget.limitUgx)) * 100)
    : 0;

  const activityDays = useMemo(() => {
    const start = addDays(parseYmd(today), -13);
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(start, index);
      return {
        date,
        label: shortDate(date),
        goals: 0,
        debts: 0,
        recurring: 0,
      };
    });
    const byDate = new Map(days.map((day) => [ymd(day.date), day]));
    for (const entry of activity) {
      const day = byDate.get(entry.date);
      if (!day) continue;
      if (entry.kind === "goal-contribution") day.goals += entry.amountUgx;
      if (entry.kind === "debt-payment") day.debts += entry.amountUgx;
      if (entry.kind === "recurring-run") day.recurring += entry.amountUgx;
    }
    return days;
  }, [activity, today]);

  const activityMix = useMemo(() => {
    const totals = { goals: 0, debts: 0, recurring: 0 };
    for (const entry of activity) {
      if (entry.kind === "goal-contribution") totals.goals += entry.amountUgx;
      if (entry.kind === "debt-payment") totals.debts += entry.amountUgx;
      if (entry.kind === "recurring-run") totals.recurring += entry.amountUgx;
    }
    return [
      { label: "Goals", value: Math.max(0, totals.goals), color: COLORS.violet },
      { label: "Debts", value: totals.debts, color: COLORS.sky },
      { label: "Recurring", value: totals.recurring, color: COLORS.emerald },
    ].filter((entry) => entry.value > 0);
  }, [activity]);

  if (section === "goals") {
    return (
      <ChartGrid>
        <ChartCard title="Savings growth" hint="All contributions, cumulative">
          <AreaChart
            data={goalTrend}
            aspectRatio="2.5 / 1"
            margin={{ top: 10, right: 10, bottom: 36, left: 92 }}
          >
            <Grid horizontal />
            <Area
              dataKey="saved"
              fill={COLORS.violet}
              stroke={COLORS.violet}
              fillOpacity={0.2}
              strokeWidth={1.6}
              fadeBottom={40}
            />
            <YAxis formatValue={display.formatMoney} />
            <XAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: COLORS.violet,
                  label: "Saved",
                  value: display.formatMoney(Number(point.saved) || 0),
                },
              ]}
            />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Goal progress" hint="Saved against target">
          {goalBars.length > 0 ? (
            <BarChart
              data={goalBars}
              xDataKey="name"
              barGap={0.3}
              aspectRatio="2.5 / 1"
              margin={{ top: 10, right: 10, bottom: 40, left: 92 }}
            >
              <Grid horizontal />
              <YAxis formatValue={display.formatMoney} />
              <Bar dataKey="target" fill={COLORS.muted} lineCap={2} />
              <Bar dataKey="saved" fill={COLORS.violet} lineCap={2} />
              <BarXAxis />
              <ChartTooltip
                rows={(point) => [
                  {
                    color: COLORS.violet,
                    label: "Saved",
                    value: display.formatMoney(Number(point.saved) || 0),
                  },
                  {
                    color: COLORS.muted,
                    label: "Target",
                    value: display.formatMoney(Number(point.target) || 0),
                  },
                ]}
              />
            </BarChart>
          ) : (
            <ChartEmpty>Add a goal to see progress here.</ChartEmpty>
          )}
        </ChartCard>
      </ChartGrid>
    );
  }

  if (section === "debts") {
    return (
      <ChartGrid>
        <ChartCard title="Debt balances" hint="Borrowed vs lent by person">
          <BarChart
            data={debtBars}
            xDataKey="name"
            barGap={0.3}
            aspectRatio="2.5 / 1"
            margin={{ top: 10, right: 10, bottom: 40, left: 92 }}
          >
            <Grid horizontal />
            <YAxis formatValue={display.formatMoney} />
            <Bar dataKey="borrowed" fill={COLORS.rose} lineCap={2} />
            <Bar dataKey="lent" fill={COLORS.emerald} lineCap={2} />
            <BarXAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: COLORS.rose,
                  label: "Borrowed",
                  value: display.formatMoney(Number(point.borrowed) || 0),
                },
                {
                  color: COLORS.emerald,
                  label: "Lent",
                  value: display.formatMoney(Number(point.lent) || 0),
                },
              ]}
            />
          </BarChart>
        </ChartCard>
        <ChartCard title="Net debt" hint="Borrowed minus lent over time">
          <AreaChart
            data={debtTrend}
            aspectRatio="2.5 / 1"
            margin={{ top: 10, right: 10, bottom: 36, left: 92 }}
          >
            <Grid horizontal />
            <Area
              dataKey="net"
              fill={COLORS.sky}
              stroke={COLORS.sky}
              fillOpacity={0.18}
              strokeWidth={1.6}
              fadeBottom={40}
            />
            <YAxis formatValue={display.formatMoney} />
            <XAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: COLORS.sky,
                  label: "Net debt",
                  value: display.formatMoney(Number(point.net) || 0),
                },
              ]}
            />
          </AreaChart>
        </ChartCard>
      </ChartGrid>
    );
  }

  if (section === "recurring") {
    return (
      <ChartGrid>
        <ChartCard title="Monthly load" hint="Enabled rules, normalised monthly">
          <BarChart
            data={recurringLoad}
            xDataKey="label"
            barGap={0.3}
            aspectRatio="2.5 / 1"
            margin={{ top: 10, right: 10, bottom: 40, left: 92 }}
          >
            <Grid horizontal />
            <YAxis formatValue={display.formatMoney} />
            <Bar dataKey="amount" fill={COLORS.sky} lineCap={2} />
            <BarXAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: COLORS.sky,
                  label: "Monthly",
                  value: display.formatMoney(Number(point.amount) || 0),
                },
              ]}
            />
          </BarChart>
        </ChartCard>
        <ChartCard title="Next 8 weeks" hint="Upcoming income and outgoings">
          <BarChart
            data={upcoming}
            xDataKey="label"
            barGap={0.25}
            aspectRatio="2.5 / 1"
            margin={{ top: 10, right: 10, bottom: 40, left: 92 }}
          >
            <Grid horizontal />
            <YAxis formatValue={display.formatMoney} />
            <Bar dataKey="income" fill={COLORS.emerald} lineCap={2} />
            <Bar dataKey="expense" fill={COLORS.amber} lineCap={2} />
            <BarXAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: COLORS.emerald,
                  label: "Income",
                  value: display.formatMoney(Number(point.income) || 0),
                },
                {
                  color: COLORS.amber,
                  label: "Outgoings",
                  value: display.formatMoney(Number(point.expense) || 0),
                },
              ]}
            />
          </BarChart>
        </ChartCard>
      </ChartGrid>
    );
  }

  if (section === "budgets") {
    return (
      <ChartGrid>
        <ChartCard title="Spent vs limit" hint="Category budgets this month">
          <BarChart
            data={budgetBars}
            xDataKey="name"
            barGap={0.3}
            aspectRatio="2.5 / 1"
            margin={{ top: 10, right: 10, bottom: 40, left: 92 }}
          >
            <Grid horizontal />
            <YAxis formatValue={display.formatMoney} />
            <Bar dataKey="limit" fill={COLORS.muted} lineCap={2} />
            <Bar dataKey="spent" fill={COLORS.emerald} lineCap={2} />
            <BarXAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: COLORS.emerald,
                  label: "Spent",
                  value: display.formatMoney(Number(point.spent) || 0),
                },
                {
                  color: COLORS.muted,
                  label: "Limit",
                  value: display.formatMoney(Number(point.limit) || 0),
                },
              ]}
            />
          </BarChart>
        </ChartCard>
        <ChartCard title="Overall usage" hint="This month">
          <div className="flex flex-col items-center justify-center">
            <Gauge
              value={overallPct}
              centerValue={Math.round(overallPct)}
              suffix="%"
              defaultLabel="used"
              totalNotches={36}
              height={210}
              width={300}
              activeFill="var(--primary)"
              inactiveFill="var(--muted)"
              needle="line"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {display.formatMoney(overallBudget?.spentUgx ?? 0)} of{" "}
              {display.formatMoney(overallBudget?.limitUgx ?? 0)}
            </p>
          </div>
        </ChartCard>
      </ChartGrid>
    );
  }

  return (
    <ChartGrid>
      <ChartCard title="Activity by day" hint="Last 14 days">
        <BarChart
          data={activityDays}
          xDataKey="label"
          stacked
          barGap={0.3}
          aspectRatio="2.5 / 1"
          margin={{ top: 10, right: 10, bottom: 40, left: 92 }}
        >
          <Grid horizontal />
          <YAxis formatValue={display.formatMoney} />
          <Bar dataKey="goals" fill={COLORS.violet} lineCap={2} />
          <Bar dataKey="debts" fill={COLORS.sky} lineCap={2} />
          <Bar dataKey="recurring" fill={COLORS.emerald} lineCap={2} />
          <BarXAxis />
          <ChartTooltip
            rows={(point) => [
              {
                color: COLORS.violet,
                label: "Goals",
                value: display.formatMoney(Number(point.goals) || 0),
              },
              {
                color: COLORS.sky,
                label: "Debts",
                value: display.formatMoney(Number(point.debts) || 0),
              },
              {
                color: COLORS.emerald,
                label: "Recurring",
                value: display.formatMoney(Number(point.recurring) || 0),
              },
            ]}
          />
        </BarChart>
      </ChartCard>
      <ChartCard title="Activity mix" hint="Selected range">
        {activityMix.length > 0 ? (
          <div className="flex flex-col items-center justify-center">
            <PieChart data={activityMix} size={210} innerRadius={58} hoverOffset={7}>
              <PieTicks
                count={84}
                strokeWidth={3}
                sliceGap={2}
                hoverEffect="slice"
                fadedOpacity={0.25}
              />
              <PieCenter defaultLabel="Activity">
                {({ value }) => (
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">
                      {display.unit}
                    </p>
                    <AnimatedNumber
                      value={value}
                      duration={0.4}
                      startOnView={false}
                      format={display.formatValue}
                      className="mt-0.5 text-[12px] font-semibold leading-none"
                    />
                  </div>
                )}
              </PieCenter>
            </PieChart>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {activityMix.map((entry) => (
                <span
                  key={entry.label}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: entry.color }}
                  />
                  {entry.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No activity in this range.
          </p>
        )}
      </ChartCard>
    </ChartGrid>
  );
}

function advance(
  date: Date,
  frequency: RecurringRule["frequency"],
): Date {
  if (frequency === "daily") return addDays(date, 1);
  if (frequency === "weekly") return addDays(date, 7);
  const next = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return next;
}
