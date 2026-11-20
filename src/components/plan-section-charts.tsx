"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  XAxis,
  YAxis,
} from "@/components/charts";
import { useCurrency } from "@/components/currency-provider";
import { useNow } from "@/lib/use-now";
import { addDays, parseYmd, ymd } from "@/lib/format";
import type { Debt, Goal, PlanActivity } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PlanChartSection = "goals" | "debts" | "activity";

const COLORS = {
  sky: "oklch(0.62 0.19 259)",
  emerald: "oklch(0.696 0.17 162)",
  violet: "oklch(0.606 0.25 292)",
};

function shortDate(value: string | Date) {
  const date = typeof value === "string" ? parseYmd(value) : value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChartCard({
  title,
  hint,
  showHeading = true,
  children,
}: {
  title: string;
  hint: string;
  showHeading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {showHeading ? (
        <div className="mb-2 flex items-start justify-between gap-3 px-1">
          <p className="text-[13px] font-medium">{title}</p>
          <p className="text-right text-[10px] text-muted-foreground">{hint}</p>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function PlanSectionCharts({
  section,
  goals,
  debts,
  activity,
  allActivity,
}: {
  section: PlanChartSection;
  goals: Goal[];
  debts: Debt[];
  activity: PlanActivity[];
  allActivity: PlanActivity[];
}) {
  const display = useCurrency();
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
    let running =
      current - deltas.reduce((total, entry) => total + entry.delta, 0);
    const points = deltas.map((entry) => {
      running += entry.delta;
      return { date: parseYmd(entry.date), net: running };
    });
    return [...points, { date: parseYmd(today), net: current }];
  }, [allActivity, debts, today]);

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

  if (section === "goals") {
    return (
      <ChartCard title="Savings growth" hint="All contributions, cumulative">
        <AreaChart
          data={goalTrend}
          style={{ height: 280 }}
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
    );
  }

  if (section === "debts") {
    return (
      <ChartCard title="Net debt" hint="Borrowed minus lent over time">
        <AreaChart
          data={debtTrend}
          style={{ height: 280 }}
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
    );
  }

  return (
    <ChartCard
      title="Activity by day"
      hint="Last 14 days"
      showHeading={false}
    >
      <BarChart
        data={activityDays}
        xDataKey="label"
        stacked
        barGap={0.3}
        className={cn("h-[280px]")}
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
  );
}
