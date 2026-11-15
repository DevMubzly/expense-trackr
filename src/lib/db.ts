import { CATEGORIES } from "./categories";
import { addDays, daysInMonth, monthKey, monthLabel, ymd } from "./format";
import { createExpenses, createSettings } from "./mock-data";
import type {
  DailyPoint,
  Expense,
  NewExpense,
  Settings,
  Stats,
} from "./types";

type Store = {
  expenses: Expense[];
  settings: Settings;
  nextId: number;
};

// Mock data lives in memory. Swap this module for Supabase later — the route
// handlers already speak the same shapes.
const globalStore = globalThis as unknown as { __xpenseStore?: Store };

function store(): Store {
  if (!globalStore.__xpenseStore) {
    const expenses = createExpenses();
    globalStore.__xpenseStore = {
      expenses,
      settings: createSettings(),
      nextId: expenses.length + 1,
    };
  }
  return globalStore.__xpenseStore;
}

export type ExpenseFilters = {
  from?: string;
  to?: string;
  category?: string;
  q?: string;
  limit?: number;
};

export function listExpenses(filters: ExpenseFilters = {}): Expense[] {
  const { from, to, category, q, limit } = filters;
  const needle = q?.trim().toLowerCase();

  return store()
    .expenses.filter((expense) => {
      if (from && expense.spentOn < from) return false;
      if (to && expense.spentOn > to) return false;
      if (category && expense.category !== category) return false;
      if (
        needle &&
        !expense.note.toLowerCase().includes(needle) &&
        !expense.category.toLowerCase().includes(needle) &&
        !String(expense.amount).includes(needle)
      ) {
        return false;
      }
      return true;
    })
    .slice(0, limit ?? Number.POSITIVE_INFINITY);
}

export function getExpense(id: string): Expense | undefined {
  return store().expenses.find((expense) => expense.id === id);
}

export function addExpense(input: NewExpense): Expense {
  const state = store();
  const rate = input.usdRate || state.settings.usdRate;
  const amountUgx =
    input.currency === "USD" ? Math.round(input.amount * rate) : Math.round(input.amount);

  const expense: Expense = {
    id: `exp_${String(state.nextId).padStart(4, "0")}`,
    amount: input.amount,
    currency: input.currency,
    amountUgx,
    usdRate: rate,
    category: input.category,
    note: input.note?.trim() || "",
    spentOn: input.spentOn,
    createdAt: new Date().toISOString(),
  };

  state.nextId += 1;
  state.expenses.unshift(expense);
  return expense;
}

export function updateExpense(id: string, patch: Partial<NewExpense>): Expense | undefined {
  const state = store();
  const index = state.expenses.findIndex((expense) => expense.id === id);
  if (index < 0) return undefined;

  const current = state.expenses[index];
  const currency = patch.currency ?? current.currency;
  const amount = patch.amount ?? current.amount;
  const rate = patch.usdRate ?? current.usdRate;
  const amountUgx = currency === "USD" ? Math.round(amount * rate) : Math.round(amount);

  const next: Expense = {
    ...current,
    ...patch,
    currency,
    amount,
    usdRate: rate,
    amountUgx,
    note: patch.note ?? current.note,
    spentOn: patch.spentOn ?? current.spentOn,
  };

  state.expenses[index] = next;
  return next;
}

export function deleteExpense(id: string): boolean {
  const state = store();
  const before = state.expenses.length;
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  return state.expenses.length !== before;
}

export function getSettings(): Settings {
  return store().settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const state = store();
  state.settings = { ...state.settings, ...patch };
  return state.settings;
}

function sum(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amountUgx, 0);
}

export function computeStats(month?: string): Stats {
  const state = store();
  const now = new Date();
  const today = ymd(now);
  const key = month ?? monthKey(today);
  const budget = state.settings.monthlyBudget;
  const dayCount = daysInMonth(key);
  const isCurrent = key === monthKey(today);

  const monthExpenses = state.expenses.filter((expense) => expense.spentOn.startsWith(key));
  const monthTotal = sum(monthExpenses);

  const todayExpenses = state.expenses.filter((expense) => expense.spentOn === today);
  const weekStart = ymd(addDays(now, -6));
  const weekExpenses = state.expenses.filter(
    (expense) => expense.spentOn >= weekStart && expense.spentOn <= today,
  );

  const byCategory = CATEGORIES.map((category) => ({
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
    for (const category of CATEGORIES) {
      point[category.id] = sum(dayExpenses.filter((expense) => expense.category === category.id));
    }
    daily.push(point);
    running += point.total;
    cumulative.push({
      date,
      spent: running,
      pace: Math.round((budget / dayCount) * day),
    });
  }

  const weekdayTotals = Array.from({ length: 7 }, () => 0);
  for (const expense of monthExpenses) {
    const [y, m, d] = expense.spentOn.split("-").map(Number);
    weekdayTotals[new Date(y, m - 1, d).getDay()] += expense.amountUgx;
  }
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
    day,
    value: weekdayTotals[index],
  }));

  const months = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (7 - index), 1);
    const monthId = ymd(date).slice(0, 7);
    return {
      month: monthId,
      label: monthLabel(monthId, true),
      total: sum(state.expenses.filter((expense) => expense.spentOn.startsWith(monthId))),
    };
  });

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = ymd(lastMonthDate).slice(0, 7);
  const lastMonthTotal = sum(
    state.expenses.filter((expense) => expense.spentOn.startsWith(lastMonthKey)),
  );

  const heat = Array.from({ length: 240 }, (_, index) => {
    const date = ymd(addDays(now, -(239 - index)));
    return {
      date,
      total: sum(state.expenses.filter((expense) => expense.spentOn === date)),
    };
  });

  return {
    month: key,
    monthLabel: monthLabel(key),
    totals: {
      month: monthTotal,
      today: sum(todayExpenses),
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
    cumulative,
    weekday,
    months,
    heat,
    recent: [...state.expenses]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 8),
  };
}

export function listMonths() {
  const state = store();
  const now = new Date();
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const monthId = ymd(date).slice(0, 7);
    const expenses = state.expenses.filter((expense) => expense.spentOn.startsWith(monthId));
    return {
      month: monthId,
      label: monthLabel(monthId),
      shortLabel: monthLabel(monthId, true),
      total: sum(expenses),
      count: expenses.length,
      top: [...expenses].sort((a, b) => b.amountUgx - a.amountUgx).slice(0, 5),
    };
  });
}
