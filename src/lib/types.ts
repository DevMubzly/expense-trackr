export type Currency = "UGX" | "USD";

export type Expense = {
  id: string;
  /** Amount as typed, in `currency`. */
  amount: number;
  currency: Currency;
  /** Canonical value in integer Ugandan shillings. */
  amountUgx: number;
  /** UGX per USD at the time it was logged, so history stays true. */
  usdRate: number;
  /** Category id from `CATEGORIES`. */
  category: string;
  note: string;
  /** YYYY-MM-DD */
  spentOn: string;
  /** ISO timestamp */
  createdAt: string;
};

export type NewExpense = {
  amount: number;
  currency: Currency;
  category: string;
  note?: string;
  spentOn: string;
  usdRate?: number;
};

export type WeekPlan = Record<string, { enabled: boolean; ranges: { id: string; start: string; end: string }[] }>;

export type Settings = {
  monthlyBudget: number;
  usdRate: number;
  defaultCurrency: Currency;
  weekPlan: WeekPlan;
};

export type CategoryTotal = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type DailyPoint = {
  date: string;
  total: number;
  [categoryId: string]: string | number;
};

export type MonthTotal = {
  month: string;
  label: string;
  total: number;
};

export type Stats = {
  month: string;
  monthLabel: string;
  totals: {
    month: number;
    today: number;
    week: number;
    avgPerDay: number;
    count: number;
    largest: number;
    budget: number;
    usd: number;
  };
  vsLastMonth: number;
  byCategory: CategoryTotal[];
  daily: DailyPoint[];
  cumulative: { date: string; spent: number; pace: number }[];
  weekday: { day: string; value: number }[];
  months: MonthTotal[];
  heat: { date: string; total: number }[];
  recent: Expense[];
};
