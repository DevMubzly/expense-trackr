import { EXPENSE_CATEGORIES } from "./categories";
import { addDays, daysInMonth, monthKey, monthLabel, parseYmd, ymd } from "./format";
import { ACCOUNTS, createSettings, createTransactions } from "./mock-data";
import { PERIOD_LABELS } from "./periods";
import {
  createBudgets,
  createDebts,
  createGoals,
  createMembers,
  createRecurring,
} from "./planning-data";
import type {
  Account,
  AccountBalance,
  Budget,
  BudgetProgress,
  DailyPoint,
  Debt,
  Expense,
  Forecast,
  ForecastPoint,
  Goal,
  HouseholdMember,
  MonthTotal,
  NetWorth,
  NewAccount,
  NewExpense,
  NewTransaction,
  PeriodStats,
  RecurringRule,
  Settings,
  StatPeriod,
  Stats,
  Transaction,
  TransactionType,
} from "./types";

type Store = {
  transactions: Transaction[];
  accounts: Account[];
  settings: Settings;
  goals: Goal[];
  debts: Debt[];
  budgets: Budget[];
  recurring: RecurringRule[];
  members: HouseholdMember[];
  nextTransactionId: number;
  nextAccountId: number;
  nextGoalId: number;
  nextDebtId: number;
  nextBudgetId: number;
  nextRecurringId: number;
  nextMemberId: number;
};

// Mock data lives in memory. Swap this module for Supabase later, the route
// handlers already speak the same shapes.
const globalStore = globalThis as unknown as { __ledgerStore?: Store };

function store(): Store {
  if (!globalStore.__ledgerStore) {
    const transactions = createTransactions();
    const accounts = ACCOUNTS.map((account) => ({ ...account }));
    globalStore.__ledgerStore = {
      transactions,
      accounts,
      settings: createSettings("acc_mtn"),
      goals: createGoals(),
      debts: createDebts(),
      budgets: createBudgets(),
      recurring: createRecurring(),
      members: createMembers(),
      nextTransactionId: transactions.length + 1,
      nextAccountId: 1,
      nextGoalId: 1,
      nextDebtId: 1,
      nextBudgetId: 1,
      nextRecurringId: 1,
      nextMemberId: 1,
    };
  }
  return globalStore.__ledgerStore;
}

export type ExpenseFilters = {
  from?: string;
  to?: string;
  category?: string;
  q?: string;
  limit?: number;
};

export type TransactionFilters = {
  type?: TransactionType;
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  q?: string;
  limit?: number;
};

function sum(transactions: Transaction[]): number {
  return transactions.reduce((total, transaction) => total + transaction.amountUgx, 0);
}

function sumFees(transactions: Transaction[]): number {
  return transactions.reduce((total, transaction) => total + (transaction.feeUgx ?? 0), 0);
}

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function timeOf(transaction: Transaction): string {
  if (transaction.spentTime) return transaction.spentTime;
  const date = new Date(transaction.createdAt);
  return Number.isNaN(date.getTime())
    ? "00:00"
    : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function ofType(transactions: Transaction[], type: TransactionType): Transaction[] {
  return transactions.filter((transaction) => transaction.type === type);
}

function nonTransfers(transactions: Transaction[]): Transaction[] {
  return transactions.filter((transaction) => transaction.type !== "transfer");
}

function accountMap(): Map<string, Account> {
  return new Map(store().accounts.map((account) => [account.id, account]));
}

export function listTransactions(filters: TransactionFilters = {}): Transaction[] {
  const { type, from, to, category, account, q, limit } = filters;
  const needle = q?.trim().toLowerCase();
  const accounts = accountMap();

  return store()
    .transactions.filter((transaction) => {
      if (type && transaction.type !== type) return false;
      if (from && transaction.spentOn < from) return false;
      if (to && transaction.spentOn > to) return false;
      if (category && transaction.category !== category) return false;
      if (
        account &&
        transaction.accountId !== account &&
        transaction.toAccountId !== account
      ) {
        return false;
      }
      if (needle) {
        const accountName =
          accounts.get(transaction.accountId)?.name.toLowerCase() ?? "";
        const destinationName =
          accounts.get(transaction.toAccountId ?? "")?.name.toLowerCase() ?? "";
        const haystack = [
          transaction.note,
          transaction.category,
          transaction.type,
          String(transaction.amount),
          accountName,
          destinationName,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.spentOn !== b.spentOn) return a.spentOn < b.spentOn ? 1 : -1;
      const aTime = timeOf(a);
      const bTime = timeOf(b);
      if (aTime !== bTime) return aTime < bTime ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    })
    .slice(0, limit ?? Number.POSITIVE_INFINITY);
}

export function getTransaction(id: string): Transaction | undefined {
  return store().transactions.find((transaction) => transaction.id === id);
}

export function addTransaction(input: NewTransaction): Transaction {
  const state = store();
  const rate = input.usdRate || state.settings.usdRate;
  const amountUgx =
    input.currency === "USD" ? Math.round(input.amount * rate) : Math.round(input.amount);
  const type = input.type;
  const category =
    type === "transfer"
      ? ""
      : input.category?.trim() || (type === "income" ? "other-income" : "other");
  const feeUgx = type === "income" ? 0 : Math.max(0, Math.round(input.feeUgx ?? 0));

  const transaction: Transaction = {
    id: `txn_${String(state.nextTransactionId).padStart(4, "0")}`,
    type,
    amount: input.amount,
    currency: input.currency,
    amountUgx,
    usdRate: rate,
    category,
    accountId: input.accountId,
    toAccountId: type === "transfer" ? input.toAccountId : undefined,
    feeUgx: feeUgx > 0 ? feeUgx : undefined,
    note: input.note?.trim() || "",
    spentOn: input.spentOn,
    spentTime: input.spentTime || nowTime(),
    createdAt: new Date().toISOString(),
    source: input.source ?? "manual",
  };

  state.nextTransactionId += 1;
  state.transactions.unshift(transaction);
  return transaction;
}

export function updateTransaction(
  id: string,
  patch: Partial<NewTransaction>,
): Transaction | undefined {
  const state = store();
  const index = state.transactions.findIndex((transaction) => transaction.id === id);
  if (index < 0) return undefined;

  const current = state.transactions[index];
  const type = patch.type ?? current.type;
  const currency = patch.currency ?? current.currency;
  const amount = patch.amount ?? current.amount;
  const rate = patch.usdRate ?? current.usdRate;
  const amountUgx = currency === "USD" ? Math.round(amount * rate) : Math.round(amount);
  const category =
    type === "transfer"
      ? ""
      : patch.category ??
        (current.category || (type === "income" ? "other-income" : "other"));
  const feeUgx =
    type === "income"
      ? 0
      : Math.max(0, Math.round(patch.feeUgx ?? current.feeUgx ?? 0));

  const next: Transaction = {
    ...current,
    ...patch,
    type,
    amount,
    currency,
    amountUgx,
    usdRate: rate,
    category,
    accountId: patch.accountId ?? current.accountId,
    toAccountId: type === "transfer" ? patch.toAccountId ?? current.toAccountId : undefined,
    feeUgx: feeUgx > 0 ? feeUgx : undefined,
    note: patch.note ?? current.note,
    spentOn: patch.spentOn ?? current.spentOn,
    spentTime: patch.spentTime ?? current.spentTime ?? timeOf(current),
    source: patch.source ?? current.source,
  };

  state.transactions[index] = next;
  return next;
}

export function deleteTransaction(id: string): boolean {
  const state = store();
  const before = state.transactions.length;
  state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
  return state.transactions.length !== before;
}

/* -------------------------------------------------------------------------- */
/* Legacy expense helpers                                                     */
/* -------------------------------------------------------------------------- */

export function listExpenses(filters: ExpenseFilters = {}): Expense[] {
  return listTransactions({ ...filters, type: "expense" });
}

export function getExpense(id: string): Expense | undefined {
  const transaction = getTransaction(id);
  return transaction?.type === "expense" ? transaction : undefined;
}

export function addExpense(input: NewExpense): Expense {
  return addTransaction({
    ...input,
    type: "expense",
    accountId: input.accountId ?? store().settings.defaultAccountId,
    category: input.category,
  });
}

export function updateExpense(
  id: string,
  patch: Partial<NewExpense>,
): Expense | undefined {
  return updateTransaction(id, { ...patch, type: "expense" });
}

export function deleteExpense(id: string): boolean {
  const transaction = getTransaction(id);
  if (transaction?.type !== "expense") return false;
  return deleteTransaction(id);
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

export function listAccounts(includeArchived = false): Account[] {
  return store().accounts.filter((account) => includeArchived || !account.archived);
}

export function getAccount(id: string): Account | undefined {
  return store().accounts.find((account) => account.id === id);
}

export function addAccount(input: NewAccount): Account {
  const state = store();
  const account: Account = {
    id: `acc_${String(state.nextAccountId).padStart(4, "0")}`,
    ...input,
  };
  state.nextAccountId += 1;
  state.accounts.push(account);
  return account;
}

export function updateAccount(
  id: string,
  patch: Partial<Account>,
): Account | undefined {
  const state = store();
  const index = state.accounts.findIndex((account) => account.id === id);
  if (index < 0) return undefined;
  const next = { ...state.accounts[index], ...patch };
  state.accounts[index] = next;
  return next;
}

export function archiveAccount(id: string, archived = true): Account | undefined {
  return updateAccount(id, { archived });
}

function accountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.openingBalanceUgx;

  for (const transaction of transactions) {
    const fee = transaction.feeUgx ?? 0;
    if (transaction.type === "income" && transaction.accountId === account.id) {
      balance += transaction.amountUgx - fee;
    }
    if (transaction.type === "expense" && transaction.accountId === account.id) {
      balance -= transaction.amountUgx + fee;
    }
    if (transaction.type === "transfer") {
      if (transaction.accountId === account.id) balance -= transaction.amountUgx + fee;
      if (transaction.toAccountId === account.id) balance += transaction.amountUgx;
    }
  }

  return Math.round(balance);
}

export function listAccountBalances(includeArchived = false): AccountBalance[] {
  const state = store();
  return state.accounts
    .filter((account) => includeArchived || !account.archived)
    .map((account) => ({
      ...account,
      balanceUgx: accountBalance(account, state.transactions),
    }));
}

export function totalLiquidBalance(): number {
  return listAccountBalances().reduce(
    (total, account) => total + account.balanceUgx,
    0,
  );
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export function getSettings(): Settings {
  return store().settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const state = store();
  state.settings = { ...state.settings, ...patch };
  return state.settings;
}

/* -------------------------------------------------------------------------- */
/* Periods and forecast                                                       */
/* -------------------------------------------------------------------------- */

function shiftMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return shifted;
}

function startOfPeriod(period: StatPeriod, now: Date, transactions: Transaction[]): Date {
  switch (period) {
    case "today":
      return now;
    case "7d":
      return addDays(now, -6);
    case "30d":
      return addDays(now, -29);
    case "90d":
      return addDays(now, -89);
    case "6m":
      return shiftMonths(now, -6);
    case "1y":
      return shiftMonths(now, -12);
    case "all": {
      const earliest = transactions.reduce<string | null>(
        (min, transaction) =>
          min === null || transaction.spentOn < min ? transaction.spentOn : min,
        null,
      );
      return parseYmd(earliest ?? ymd(now));
    }
  }
}

function sparkDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function computePeriodStats(
  period: StatPeriod,
  now: Date,
  transactions: Transaction[],
): PeriodStats {
  const to = ymd(now);
  const from = ymd(startOfPeriod(period, now, transactions));
  const days = Math.max(
    1,
    Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86_400_000) + 1,
  );
  const inRange = nonTransfers(transactions).filter(
    (transaction) => transaction.spentOn >= from && transaction.spentOn <= to,
  );
  const expenseTransactions = ofType(inRange, "expense");
  const incomeTransactions = ofType(inRange, "income");
  const expense = sum(expenseTransactions);
  const income = sum(incomeTransactions);

  const byDay = new Map<string, { expense: number; income: number; count: number }>();
  for (const transaction of inRange) {
    const entry = byDay.get(transaction.spentOn) ?? { expense: 0, income: 0, count: 0 };
    if (transaction.type === "expense") entry.expense += transaction.amountUgx;
    if (transaction.type === "income") entry.income += transaction.amountUgx;
    entry.count += 1;
    byDay.set(transaction.spentOn, entry);
  }

  // Today reads as an intraday line; longer ranges use daily points, and
  // weekly buckets keep long sparklines legible.
  const bucketDays = days > 90 ? 7 : 1;
  const last = parseYmd(to);
  const spark: PeriodStats["spark"] = [];

  if (period === "today") {
    const byHour = new Map<
      number,
      { expense: number; income: number; count: number }
    >();
    for (const transaction of inRange) {
      const hour = Math.min(
        23,
        Math.max(0, Number.parseInt(timeOf(transaction), 10) || 0),
      );
      const entry = byHour.get(hour) ?? { expense: 0, income: 0, count: 0 };
      if (transaction.type === "expense") entry.expense += transaction.amountUgx;
      if (transaction.type === "income") entry.income += transaction.amountUgx;
      entry.count += 1;
      byHour.set(hour, entry);
    }

    for (let hour = 0; hour < 24; hour += 1) {
      const entry = byHour.get(hour) ?? { expense: 0, income: 0, count: 0 };
      spark.push({
        day: from,
        label: `${String(hour).padStart(2, "0")}:00`,
        expense: entry.expense,
        income: entry.income,
        net: entry.income - entry.expense,
        count: entry.count,
      });
    }
  } else {
    let cursor = parseYmd(from);

    while (cursor <= last) {
      const bucketEnd = new Date(
        Math.min(addDays(cursor, bucketDays - 1).getTime(), last.getTime()),
      );
      let bucketExpense = 0;
      let bucketIncome = 0;
      let bucketCount = 0;
      for (let day = new Date(cursor); day <= bucketEnd; day = addDays(day, 1)) {
        const entry = byDay.get(ymd(day));
        if (!entry) continue;
        bucketExpense += entry.expense;
        bucketIncome += entry.income;
        bucketCount += entry.count;
      }
      spark.push({
        day: ymd(cursor),
        label:
          bucketDays === 7
            ? `Week of ${sparkDateLabel(cursor)}`
            : sparkDateLabel(cursor),
        expense: bucketExpense,
        income: bucketIncome,
        net: bucketIncome - bucketExpense,
        count: bucketCount,
      });
      cursor = addDays(bucketEnd, 1);
    }
  }

  return {
    key: period,
    label: PERIOD_LABELS[period],
    from,
    to,
    days,
    expense,
    income,
    net: income - expense,
    avgExpensePerDay: Math.round(expense / days),
    largestExpense: Math.max(0, ...expenseTransactions.map((transaction) => transaction.amountUgx)),
    count: inRange.length,
    spark,
  };
}

function dateForPayday(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function computeForecast(
  now: Date,
  transactions: Transaction[],
  settings: Settings,
  liquidBalance: number,
): Forecast {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const payday = Math.min(31, Math.max(1, Math.round(settings.payday)));
  let paydayDate = dateForPayday(now.getFullYear(), now.getMonth(), payday);
  if (paydayDate <= today) {
    paydayDate = dateForPayday(now.getFullYear(), now.getMonth() + 1, payday);
  }
  let previousPaydayDate = dateForPayday(
    now.getFullYear(),
    now.getMonth(),
    payday,
  );
  if (previousPaydayDate > today) {
    previousPaydayDate = dateForPayday(
      now.getFullYear(),
      now.getMonth() - 1,
      payday,
    );
  }
  const daysToPayday = Math.max(
    1,
    Math.round((paydayDate.getTime() - today.getTime()) / 86_400_000),
  );
  const bufferUgx = Math.max(0, Math.round(settings.forecastBufferUgx));

  const burnStart = ymd(addDays(now, -29));
  const burnTransactions = ofType(transactions, "expense").filter(
    (transaction) => transaction.spentOn >= burnStart && transaction.spentOn <= ymd(now),
  );
  const dailyBurnUgx = Math.round(
    (sum(burnTransactions) + sumFees(burnTransactions)) / 30,
  );
  const projectedBalanceUgx = liquidBalance - dailyBurnUgx * daysToPayday;
  const safePerDayUgx = Math.max(
    0,
    Math.round((liquidBalance - bufferUgx) / daysToPayday),
  );

  const dailyNet = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type === "transfer") continue;
    const value =
      transaction.type === "income"
        ? transaction.amountUgx - (transaction.feeUgx ?? 0)
        : -(transaction.amountUgx + (transaction.feeUgx ?? 0));
    dailyNet.set(
      transaction.spentOn,
      (dailyNet.get(transaction.spentOn) ?? 0) + value,
    );
  }

  const historyBalances = new Map<string, number>();
  let running = liquidBalance;
  for (
    let day = new Date(today);
    day >= previousPaydayDate;
    day = addDays(day, -1)
  ) {
    const key = ymd(day);
    historyBalances.set(key, Math.round(running));
    running -= dailyNet.get(key) ?? 0;
  }

  const points: ForecastPoint[] = [];
  for (
    let day = new Date(previousPaydayDate);
    day <= today;
    day = addDays(day, 1)
  ) {
    const key = ymd(day);
    points.push({
      date: key,
      balance: historyBalances.get(key) ?? 0,
      projected: false,
    });
  }
  for (let offset = 1; offset <= daysToPayday; offset += 1) {
    const date = addDays(now, offset);
    points.push({
      date: ymd(date),
      balance: Math.round(liquidBalance - dailyBurnUgx * offset),
      projected: true,
    });
  }

  return {
    payday,
    daysToPayday,
    liquidBalanceUgx: liquidBalance,
    dailyBurnUgx,
    projectedBalanceUgx,
    safePerDayUgx,
    bufferUgx,
    points,
  };
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                      */
/* -------------------------------------------------------------------------- */

export function computeStats(
  month?: string,
  period: StatPeriod = "30d",
  dayOffset = 0,
): Stats {
  const state = store();
  const now = new Date();
  const today = ymd(now);
  const key = month ?? monthKey(today);
  const budget = state.settings.monthlyBudget;
  const dayCount = daysInMonth(key);
  const isCurrent = key === monthKey(today);
  const accounts = listAccountBalances();
  const liquidBalance = accounts.reduce((total, account) => total + account.balanceUgx, 0);
  const periodStats = computePeriodStats(period, now, state.transactions);

  const monthTransactions = state.transactions.filter(
    (transaction) => transaction.spentOn.startsWith(key) && transaction.type !== "transfer",
  );
  const monthExpenses = ofType(monthTransactions, "expense");
  const monthIncome = ofType(monthTransactions, "income");
  const monthTotal = sum(monthExpenses);
  const monthIncomeTotal = sum(monthIncome);

  const todayTransactions = state.transactions.filter(
    (transaction) => transaction.spentOn === today && transaction.type !== "transfer",
  );
  const todayExpenses = ofType(todayTransactions, "expense");
  const todayIncome = ofType(todayTransactions, "income");

  const weekStart = ymd(addDays(now, -6));
  const weekExpenses = state.transactions.filter(
    (transaction) =>
      transaction.type === "expense" &&
      transaction.spentOn >= weekStart &&
      transaction.spentOn <= today,
  );

  const byCategory = EXPENSE_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    value: sum(monthExpenses.filter((expense) => expense.category === category.id)),
    color: category.color,
  }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const [year, monthNumber] = key.split("-").map(Number);
  const lastDay = isCurrent ? now.getDate() : dayCount;
  const daily: DailyPoint[] = [];
  const cumulative: Stats["cumulative"] = [];
  let running = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const date = ymd(new Date(year, monthNumber - 1, day));
    const dayExpenses = monthExpenses.filter((expense) => expense.spentOn === date);
    const point: DailyPoint = { date, total: sum(dayExpenses) };
    for (const category of EXPENSE_CATEGORIES) {
      point[category.id] = sum(
        dayExpenses.filter((expense) => expense.category === category.id),
      );
    }
    daily.push(point);
    running += point.total;
    cumulative.push({
      date,
      spent: running,
      pace: Math.round((budget / dayCount) * day),
    });
  }

  const allExpenses = ofType(state.transactions, "expense");
  const dailyEnd = dayOffset > 0 ? addDays(now, -dayOffset * 30) : now;
  const daily30: DailyPoint[] = Array.from({ length: 30 }, (_, index) => {
    const date = ymd(addDays(dailyEnd, -(29 - index)));
    const dayExpenses = allExpenses.filter(
      (expense) => expense.spentOn === date,
    );
    const point: DailyPoint = { date, total: sum(dayExpenses) };
    for (const category of EXPENSE_CATEGORIES) {
      point[category.id] = sum(
        dayExpenses.filter((expense) => expense.category === category.id),
      );
    }
    return point;
  });

  const weekdayTotals = Array.from({ length: 7 }, () => 0);  for (const expense of monthExpenses) {
    const [y, m, d] = expense.spentOn.split("-").map(Number);
    weekdayTotals[new Date(y, m - 1, d).getDay()] += expense.amountUgx;
  }
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
    day,
    value: weekdayTotals[index],
  }));

  const months: MonthTotal[] = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (23 - index), 1);
    const monthId = ymd(date).slice(0, 7);
    return {
      month: monthId,
      label: monthLabel(monthId, true),
      total: sum(
        state.transactions.filter(
          (transaction) =>
            transaction.type === "expense" &&
            transaction.spentOn.startsWith(monthId),
        ),
      ),
    };
  });

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = ymd(lastMonthDate).slice(0, 7);
  const lastMonthTotal = sum(
    state.transactions.filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.spentOn.startsWith(lastMonthKey),
    ),
  );

  const heat = Array.from({ length: 240 }, (_, index) => {
    const date = ymd(addDays(now, -(239 - index)));
    const dayExpenses = state.transactions.filter(
      (transaction) =>
        transaction.type === "expense" && transaction.spentOn === date,
    );
    return {
      date,
      total: sum(dayExpenses),
      count: dayExpenses.length,
    };
  });

  const periodFrom = periodStats.from;
  const periodTo = periodStats.to;
  const periodFees = sumFees(
    state.transactions.filter(
      (transaction) =>
        transaction.spentOn >= periodFrom && transaction.spentOn <= periodTo,
    ),
  );
  const monthFees = sumFees(
    state.transactions.filter((transaction) => transaction.spentOn.startsWith(key)),
  );

  return {
    month: key,
    monthLabel: monthLabel(key),
    period: periodStats,
    totals: {
      month: monthTotal,
      income: monthIncomeTotal,
      net: monthIncomeTotal - monthTotal,
      today: sum(todayExpenses),
      todayIncome: sum(todayIncome),
      todayNet: sum(todayIncome) - sum(todayExpenses),
      week: sum(weekExpenses),
      avgPerDay: Math.round(monthTotal / Math.max(1, isCurrent ? now.getDate() : dayCount)),
      count: monthExpenses.length,
      largest: Math.max(0, ...monthExpenses.map((expense) => expense.amountUgx)),
      budget,
      usd: Math.round(monthTotal / state.settings.usdRate),
    },
    vsLastMonth:
      lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0,
    byCategory,
    daily,
    daily30,
    cumulative,
    weekday,
    months,
    heat,
    recent: [...state.transactions]
      .sort((a, b) => {
        if (a.spentOn !== b.spentOn) return a.spentOn < b.spentOn ? 1 : -1;
        const aTime = timeOf(a);
        const bTime = timeOf(b);
        if (aTime !== bTime) return aTime < bTime ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      })
      .slice(0, 8),
    accounts,
    forecast: computeForecast(now, state.transactions, state.settings, liquidBalance),
    momoFees: { month: monthFees, period: periodFees },
  };
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                      */
/* -------------------------------------------------------------------------- */

function nextSuffix(items: { id: string }[], prefix: string): number {
  let next = 1;
  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  for (const item of items) {
    const match = item.id.match(pattern);
    if (match) next = Math.max(next, Number(match[1]) + 1);
  }
  return next;
}

export function listGoals(): Goal[] {
  return [...store().goals].sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export function addGoal(input: Omit<Goal, "id" | "createdAt">): Goal {
  const state = store();
  const goal: Goal = {
    id: `goal_${String(nextSuffix(state.goals, "goal")).padStart(4, "0")}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
  state.goals.push(goal);
  return goal;
}

export function updateGoal(id: string, patch: Partial<Goal>): Goal | undefined {
  const state = store();
  const index = state.goals.findIndex((goal) => goal.id === id);
  if (index < 0) return undefined;
  state.goals[index] = { ...state.goals[index], ...patch };
  return state.goals[index];
}

export function deleteGoal(id: string): boolean {
  const state = store();
  const before = state.goals.length;
  state.goals = state.goals.filter((goal) => goal.id !== id);
  return state.goals.length !== before;
}

/* -------------------------------------------------------------------------- */
/* Debts                                                                      */
/* -------------------------------------------------------------------------- */

export function listDebts(): Debt[] {
  return [...store().debts].sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

export function addDebt(input: Omit<Debt, "id" | "createdAt">): Debt {
  const state = store();
  const debt: Debt = {
    id: `debt_${String(nextSuffix(state.debts, "debt")).padStart(4, "0")}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
  state.debts.push(debt);
  return debt;
}

export function updateDebt(id: string, patch: Partial<Debt>): Debt | undefined {
  const state = store();
  const index = state.debts.findIndex((debt) => debt.id === id);
  if (index < 0) return undefined;
  state.debts[index] = { ...state.debts[index], ...patch };
  return state.debts[index];
}

export function deleteDebt(id: string): boolean {
  const state = store();
  const before = state.debts.length;
  state.debts = state.debts.filter((debt) => debt.id !== id);
  return state.debts.length !== before;
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                    */
/* -------------------------------------------------------------------------- */

export function listBudgets(): BudgetProgress[] {
  const state = store();
  const now = new Date();
  const key = monthKey(now);
  const weekStart = ymd(addDays(now, -6));
  const monthExpenses = state.transactions.filter(
    (transaction) =>
      transaction.type === "expense" && transaction.spentOn.startsWith(key),
  );
  const weekExpenses = state.transactions.filter(
    (transaction) =>
      transaction.type === "expense" &&
      transaction.spentOn >= weekStart &&
      transaction.spentOn <= ymd(now),
  );

  return state.budgets.map((budget) => {
    const pool = budget.period === "weekly" ? weekExpenses : monthExpenses;
    return {
      ...budget,
      spentUgx:
        budget.categoryId === "all"
          ? sum(pool)
          : sum(
              pool.filter(
                (transaction) => transaction.category === budget.categoryId,
              ),
            ),
    };
  });
}

export function addBudget(input: Omit<Budget, "id">): Budget {
  const state = store();
  const budget: Budget = {
    id: `budget_${String(nextSuffix(state.budgets, "budget")).padStart(4, "0")}`,
    ...input,
  };
  state.budgets.push(budget);
  return budget;
}

export function updateBudget(id: string, patch: Partial<Budget>): Budget | undefined {
  const state = store();
  const index = state.budgets.findIndex((budget) => budget.id === id);
  if (index < 0) return undefined;
  state.budgets[index] = { ...state.budgets[index], ...patch };
  return state.budgets[index];
}

export function deleteBudget(id: string): boolean {
  const state = store();
  const before = state.budgets.length;
  state.budgets = state.budgets.filter((budget) => budget.id !== id);
  return state.budgets.length !== before;
}

/* -------------------------------------------------------------------------- */
/* Recurring rules                                                            */
/* -------------------------------------------------------------------------- */

export function listRecurring(): RecurringRule[] {
  return [...store().recurring].sort((a, b) => a.nextOn.localeCompare(b.nextOn));
}

export function addRecurring(input: Omit<RecurringRule, "id">): RecurringRule {
  const state = store();
  const rule: RecurringRule = {
    id: `rec_${String(nextSuffix(state.recurring, "rec")).padStart(4, "0")}`,
    ...input,
  };
  state.recurring.push(rule);
  return rule;
}

export function updateRecurring(
  id: string,
  patch: Partial<RecurringRule>,
): RecurringRule | undefined {
  const state = store();
  const index = state.recurring.findIndex((rule) => rule.id === id);
  if (index < 0) return undefined;
  state.recurring[index] = { ...state.recurring[index], ...patch };
  return state.recurring[index];
}

export function deleteRecurring(id: string): boolean {
  const state = store();
  const before = state.recurring.length;
  state.recurring = state.recurring.filter((rule) => rule.id !== id);
  return state.recurring.length !== before;
}

function advanceDate(date: string, frequency: RecurringRule["frequency"]): string {
  const parsed = parseYmd(date);
  if (frequency === "daily") return ymd(addDays(parsed, 1));
  if (frequency === "weekly") return ymd(addDays(parsed, 7));
  return ymd(shiftMonths(parsed, 1));
}

export function runDueRecurring(now = new Date()): { created: number } {
  const state = store();
  const today = ymd(now);
  let created = 0;

  for (const rule of state.recurring) {
    if (!rule.enabled) continue;
    let guard = 0;
    while (rule.nextOn <= today && guard < 24) {
      addTransaction({
        type: rule.type,
        amount: rule.amountUgx,
        currency: "UGX",
        category: rule.category,
        accountId: rule.accountId,
        toAccountId: rule.toAccountId,
        note: rule.note || rule.name,
        spentOn: rule.nextOn,
        source: "recurring",
      });
      rule.nextOn = advanceDate(rule.nextOn, rule.frequency);
      created += 1;
      guard += 1;
    }
  }

  return { created };
}

/* -------------------------------------------------------------------------- */
/* Household                                                                  */
/* -------------------------------------------------------------------------- */

export function listMembers(): HouseholdMember[] {
  return [...store().members];
}

export function addMember(
  input: Omit<HouseholdMember, "id">,
): HouseholdMember {
  const state = store();
  const member: HouseholdMember = {
    id: `member_${String(nextSuffix(state.members, "member")).padStart(4, "0")}`,
    ...input,
  };
  state.members.push(member);
  return member;
}

export function updateMember(
  id: string,
  patch: Partial<HouseholdMember>,
): HouseholdMember | undefined {
  const state = store();
  const index = state.members.findIndex((member) => member.id === id);
  if (index < 0) return undefined;
  state.members[index] = { ...state.members[index], ...patch };
  return state.members[index];
}

export function deleteMember(id: string): boolean {
  const state = store();
  const member = state.members.find((entry) => entry.id === id);
  if (!member || member.role === "owner") return false;
  const before = state.members.length;
  state.members = state.members.filter((entry) => entry.id !== id);
  return state.members.length !== before;
}

/* -------------------------------------------------------------------------- */
/* Net worth and portability                                                  */
/* -------------------------------------------------------------------------- */

export function computeNetWorth(): NetWorth {
  const state = store();
  const accounts = listAccountBalances();
  const lent = state.debts
    .filter((debt) => debt.direction === "lent")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const borrowed = state.debts
    .filter((debt) => debt.direction === "borrowed")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const liquid = accounts.reduce((total, account) => total + account.balanceUgx, 0);
  const assets = liquid + lent;
  const liabilities = borrowed;
  const stats = computeStats();
  const history = stats.forecast.points
    .filter((point) => !point.projected)
    .map((point) => ({ date: point.date, value: point.balance + lent - borrowed }));

  return {
    assets,
    liabilities,
    total: assets - liabilities,
    history,
  };
}

export function exportData() {
  const state = store();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    accounts: state.accounts,
    settings: state.settings,
    goals: state.goals,
    debts: state.debts,
    budgets: state.budgets,
    recurring: state.recurring,
    members: state.members,
  };
}

export function importData(input: unknown): { imported: boolean; error?: string } {
  if (!input || typeof input !== "object") {
    return { imported: false, error: "Invalid backup" };
  }
  const data = input as Record<string, unknown>;
  const arrays = ["transactions", "accounts", "goals", "debts", "budgets", "recurring", "members"] as const;
  for (const key of arrays) {
    if (!Array.isArray(data[key])) {
      return { imported: false, error: `Missing ${key}` };
    }
  }

  const state = store();
  state.transactions = data.transactions as Transaction[];
  state.accounts = data.accounts as Account[];
  state.goals = data.goals as Goal[];
  state.debts = data.debts as Debt[];
  state.budgets = data.budgets as Budget[];
  state.recurring = data.recurring as RecurringRule[];
  state.members = data.members as HouseholdMember[];
  state.settings = {
    ...createSettings(),
    ...(data.settings as Partial<Settings> | undefined),
  };
  state.nextTransactionId = Math.max(
    state.nextTransactionId,
    nextSuffix(state.transactions, "txn"),
  );
  state.nextAccountId = Math.max(state.nextAccountId, nextSuffix(state.accounts, "acc"));
  state.nextGoalId = Math.max(state.nextGoalId, nextSuffix(state.goals, "goal"));
  state.nextDebtId = Math.max(state.nextDebtId, nextSuffix(state.debts, "debt"));
  state.nextBudgetId = Math.max(state.nextBudgetId, nextSuffix(state.budgets, "budget"));
  state.nextRecurringId = Math.max(state.nextRecurringId, nextSuffix(state.recurring, "rec"));
  state.nextMemberId = Math.max(state.nextMemberId, nextSuffix(state.members, "member"));
  return { imported: true };
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function transactionsCsv(): string {
  const state = store();
  const accounts = new Map(state.accounts.map((account) => [account.id, account.name]));
  const header = [
    "id",
    "type",
    "date",
    "amount",
    "currency",
    "amount_ugx",
    "category",
    "account",
    "to_account",
    "note",
    "fee_ugx",
    "source",
  ];
  const rows = state.transactions.map((transaction) =>
    [
      transaction.id,
      transaction.type,
      transaction.spentOn,
      transaction.amount,
      transaction.currency,
      transaction.amountUgx,
      transaction.category,
      accounts.get(transaction.accountId) ?? transaction.accountId,
      transaction.toAccountId
        ? accounts.get(transaction.toAccountId) ?? transaction.toAccountId
        : "",
      transaction.note,
      transaction.feeUgx ?? "",
      transaction.source,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}
