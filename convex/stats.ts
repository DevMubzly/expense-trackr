import type { Doc, Id } from "./_generated/dataModel";

type Input = {
  params: Record<string, unknown> | undefined;
  userId: Id<"users">;
  accounts: Record<string, unknown>[];
  categories: { id: string; label: string; color: string; kind: string; iconKey: string }[];
  transactions: Record<string, unknown>[];
  budgets: Doc<"budgets">[];
  goals: Doc<"goals">[];
  goalContributions: Doc<"goalContributions">[];
  debts: Doc<"debts">[];
  debtPayments: Doc<"debtPayments">[];
  recurring: Doc<"recurringRules">[];
  incomeSources: Doc<"incomeSources">[];
  settings: Record<string, unknown>;
};

type Tx = {
  id: string;
  type: string;
  amountUgx: number;
  feeUgx?: number;
  category: string;
  spentOn: string;
  spentTime: string;
  note: string;
  source?: string;
};

const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const parseYmd = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
const sum = (rows: Tx[]) => rows.reduce((total, row) => total + row.amountUgx, 0);

const PERIOD_DAYS: Record<string, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 183,
  "1y": 365,
  all: 3650,
};

export function buildStats(input: Input) {
  const { params, categories, transactions, budgets, goals, goalContributions, debts, debtPayments, recurring, incomeSources, settings } = input;
  const all = transactions as Tx[];
  const now = new Date();
  const today = ymd(now);
  const month = today.slice(0, 7);
  const periodKey = typeof params?.period === "string" ? params.period : "30d";
  const days = PERIOD_DAYS[periodKey] ?? 30;
  const from = ymd(addDays(now, -(days - 1)));

  const notTransfers = all.filter((t) => t.type !== "transfer");
  const expenses = notTransfers.filter((t) => t.type === "expense");
  const incomes = notTransfers.filter((t) => t.type === "income");
  const monthlyExpenses = expenses.filter((t) => t.spentOn.startsWith(month));
  const monthlyIncome = incomes.filter((t) => t.spentOn.startsWith(month));
  const todayExpenses = expenses.filter((t) => t.spentOn === today);
  const todayIncome = incomes.filter((t) => t.spentOn === today);
  const weekExpenses = expenses.filter((t) => t.spentOn >= ymd(addDays(now, -6)) && t.spentOn <= today);

  const limitUgx = budgets.find((b) => b.period === "monthly")?.limitUgx ?? 0;
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  const byCategory = expenseCategories
    .map((category) => ({
      id: category.id,
      label: category.label,
      value: sum(monthlyExpenses.filter((t) => t.category === category.id)),
      color: category.color,
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed = now.getDate();
  const cumulative: { date: string; spent: number; pace: number }[] = [];
  const daily: Record<string, string | number>[] = [];
  let running = 0;
  for (let day = 1; day <= elapsed; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const dayRows = monthlyExpenses.filter((t) => t.spentOn === date);
    const point: Record<string, string | number> = { date, total: sum(dayRows) };
    for (const category of expenseCategories) {
      point[category.id] = sum(dayRows.filter((t) => t.category === category.id));
    }
    daily.push(point);
    running += Number(point.total);
    cumulative.push({
      date,
      spent: running,
      pace: Math.round((limitUgx / daysInMonth) * day),
    });
  }

  const daily30: Record<string, string | number>[] = Array.from({ length: 30 }, (_, index) => {
    const date = ymd(addDays(now, -(29 - index)));
    const rows = expenses.filter((t) => t.spentOn === date);
    const point: Record<string, string | number> = { date, total: sum(rows) };
    for (const category of expenseCategories) {
      point[category.id] = sum(rows.filter((t) => t.category === category.id));
    }
    return point;
  });

  const periodExpenses = expenses.filter((t) => t.spentOn >= from && t.spentOn <= today);
  const periodIncome = incomes.filter((t) => t.spentOn >= from && t.spentOn <= today);
  const spark = daily30.slice(-Math.min(30, days)).map((point) => ({
    day: String(point.date),
    label: String(point.date).slice(5),
    expense: Number(point.total),
    income: sum(periodIncome.filter((t) => t.spentOn === point.date)),
    net: Number(point.total) - sum(periodIncome.filter((t) => t.spentOn === point.date)),
    count: all.filter((t) => t.spentOn === point.date).length,
  }));

  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  for (const t of monthlyExpenses) weekdayTotals[parseYmd(t.spentOn).getDay()] += t.amountUgx;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
    day,
    value: weekdayTotals[index],
  }));

  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const key = ymd(date).slice(0, 7);
    return {
      month: key,
      label: parseYmd(`${key}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      total: sum(expenses.filter((t) => t.spentOn.startsWith(key))),
    };
  });

  const heat = Array.from({ length: 240 }, (_, index) => {
    const date = ymd(addDays(now, -(239 - index)));
    return { date, total: sum(expenses.filter((t) => t.spentOn === date)), count: expenses.filter((t) => t.spentOn === date).length };
  });

  const lastMonth = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  const lastMonthTotal = sum(expenses.filter((t) => t.spentOn.startsWith(lastMonth)));
  const monthTotal = sum(monthlyExpenses);
  const payday = Number(settings.payday ?? 28);
  const daysToPayday = payday >= elapsed ? payday - elapsed : daysInMonth - elapsed + payday;

  return {
    month,
    monthLabel: parseYmd(`${month}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    period: {
      key: periodKey,
      label: periodKey,
      from,
      to: today,
      days,
      expense: sum(periodExpenses),
      income: sum(periodIncome),
      net: sum(periodIncome) - sum(periodExpenses),
      avgExpensePerDay: Math.round(sum(periodExpenses) / days),
      largestExpense: Math.max(0, ...periodExpenses.map((t) => t.amountUgx)),
      count: periodExpenses.length + periodIncome.length,
      spark,
    },
    totals: {
      month: monthTotal,
      income: sum(monthlyIncome),
      net: sum(monthlyIncome) - monthTotal,
      today: sum(todayExpenses),
      todayIncome: sum(todayIncome),
      todayNet: sum(todayIncome) - sum(todayExpenses),
      week: sum(weekExpenses),
      avgPerDay: Math.round(monthTotal / elapsed),
      count: monthlyExpenses.length + monthlyIncome.length,
      largest: Math.max(0, ...monthlyExpenses.map((t) => t.amountUgx)),
      budget: limitUgx,
      usd: Math.round(monthTotal / Number(settings.usdRate ?? 3800)),
    },
    vsLastMonth: lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0,
    byCategory,
    daily,
    daily30,
    cumulative,
    weekday,
    months,
    heat,
    recent: (transactions as Tx[]).slice(0, 8) as unknown as Record<string, unknown>[],
    accounts: input.accounts,
    forecast: (() => {
      const liquidBalanceUgx = input.accounts.reduce(
        (total, a) => total + Number((a as { balanceUgx?: number }).balanceUgx ?? 0),
        0,
      );
      const dailyBurnUgx = Math.round(
        sum(expenses.filter((t) => t.spentOn >= ymd(addDays(now, -29)))) / 30,
      );
      const points = [{ date: today, balance: liquidBalanceUgx, projected: false }];
      const horizon = Math.min(Math.max(1, daysToPayday), 14);
      for (let day = 1; day <= horizon; day += 1) {
        points.push({
          date: ymd(addDays(now, day)),
          balance: Math.max(0, liquidBalanceUgx - dailyBurnUgx * day),
          projected: true,
        });
      }
      return {
        payday,
        daysToPayday,
        liquidBalanceUgx,
        dailyBurnUgx,
        projectedBalanceUgx: points[points.length - 1].balance,
        safePerDayUgx: Math.max(
          0,
          Math.round((liquidBalanceUgx - Number(settings.forecastBufferUgx ?? 0)) / Math.max(1, daysToPayday)),
        ),
        bufferUgx: Number(settings.forecastBufferUgx ?? 0),
        points,
      };
    })(),
    momoFees: {
      month: monthlyExpenses.reduce((total, t) => total + (t.feeUgx ?? 0), 0),
      period: periodExpenses.reduce((total, t) => total + (t.feeUgx ?? 0), 0),
    },
    goals,
    debts,
    recurring,
    incomeSources,
    activity: [
      ...goalContributions.map((c) => ({
        id: c._id,
        kind: "goal-contribution",
        date: c.date,
        amountUgx: c.amountUgx,
        title: goals.find((g) => g._id === c.goalId)?.name ?? "Savings pot",
        detail: c.amountUgx >= 0 ? "Savings deposit" : "Savings withdrawal",
        accountName: input.accounts.find(
          (a) => a.id === c.accountId,
        )?.name,
        refId: c._id,
      })),
      ...debtPayments.map((p) => ({
        id: p._id,
        kind: "debt-payment",
        date: p.date,
        amountUgx: p.amountUgx,
        title: debts.find((d) => d._id === p.debtId)?.counterparty ?? "Debt",
        detail: "Payment",
        accountName: input.accounts.find(
          (a) => a.id === p.accountId,
        )?.name,
        refId: p._id,
      })),
      ...(all as Tx[]).filter((t) => t.source === "recurring").map((t) => ({
        id: t.id,
        kind: "recurring-run",
        date: t.spentOn,
        amountUgx: t.amountUgx,
        title: t.note || "Recurring run",
        detail: "Recurring run",
        refId: t.id,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
