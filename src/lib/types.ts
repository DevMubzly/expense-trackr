export type Currency = "UGX" | "USD" | "KES" | "RWF" | "TZS";

export type TransactionType = "expense" | "income" | "transfer";

export type TransactionSource =
  | "manual"
  | "ai"
  | "receipt"
  | "recurring"
  | "import";

export type Transaction = {
  id: string;
  type: TransactionType;
  /** Amount as typed, in `currency`. */
  amount: number;
  currency: Currency;
  /** Canonical value in integer Ugandan shillings. */
  amountUgx: number;
  /** UGX per USD at the time it was logged, so history stays true. */
  usdRate: number;
  /** Category id for expenses/income. Empty for transfers. */
  category: string;
  /** Source account. */
  accountId: string;
  /** Destination account for transfers. */
  toAccountId?: string;
  /** Mobile Money fee, in UGX. */
  feeUgx?: number;
  note: string;
  /** YYYY-MM-DD */
  spentOn: string;
  /** Local time of the entry, HH:mm. */
  spentTime: string;
  /** ISO timestamp */
  createdAt: string;
  source: TransactionSource;
};

export type NewTransaction = {
  type: TransactionType;
  amount: number;
  currency: Currency;
  category?: string;
  accountId: string;
  toAccountId?: string;
  feeUgx?: number;
  note?: string;
  spentOn: string;
  spentTime?: string;
  usdRate?: number;
  source?: TransactionSource;
};

/** Backwards-compatible alias for older helpers. */
export type Expense = Transaction;
export type NewExpense = {
  amount: number;
  currency: Currency;
  category: string;
  note?: string;
  spentOn: string;
  usdRate?: number;
  accountId?: string;
};

export type AccountType = "cash" | "bank" | "momo";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  provider?: string;
  color: string;
  openingBalanceUgx: number;
  archived?: boolean;
};

export type NewAccount = {
  name: string;
  type: AccountType;
  provider?: string;
  color: string;
  openingBalanceUgx: number;
};

export type AccountBalance = Account & {
  balanceUgx: number;
};

export type WeekPlan = Record<string, { enabled: boolean; ranges: { id: string; start: string; end: string }[] }>;

export type Settings = {
  usdRate: number;
  defaultCurrency: Currency;
  defaultAccountId: string;
  payday: number;
  forecastBufferUgx: number;
  weekPlan: WeekPlan;
  profileName: string;
  profileEmail: string;
  profilePhone: string;
  avatarDataUrl: string;
};

export type IncomeSource = {
  id: string;
  name: string;
  categoryId: string;
  accountId: string;
  expectedMonthlyUgx: number;
  cadence: "fixed" | "irregular";
  payday?: number;
  active: boolean;
  createdAt: string;
};

export type FinanceOverview = {
  revision: number;
  settings: Settings;
  accounts: AccountBalance[];
  totals: {
    liquidUgx: number;
    goalsSavedUgx: number;
    lentUgx: number;
    borrowedUgx: number;
    netWorthUgx: number;
  };
  budget: {
    limitUgx: number;
    spentUgx: number;
    remainingUgx: number;
  };
  earnings: {
    expectedMonthlyUgx: number;
    actualMonthUgx: number;
    actualAllTimeUgx: number;
    sources: {
      id: string;
      name: string;
      categoryId: string;
      accountId: string;
      expectedMonthlyUgx: number;
      actualMonthUgx: number;
      cadence: IncomeSource["cadence"];
      active: boolean;
    }[];
  };
  payday: number;
  daysToPayday: number;
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

export type StatPeriod = "all" | "today" | "7d" | "30d" | "90d" | "6m" | "1y";

export type PeriodPoint = {
  day: string;
  /** Display label for the sparkline tooltip (hour, date, or week). */
  label: string;
  expense: number;
  income: number;
  net: number;
  count: number;
};

export type PeriodStats = {
  key: StatPeriod;
  label: string;
  from: string;
  to: string;
  /** Inclusive calendar days in the range. */
  days: number;
  expense: number;
  income: number;
  net: number;
  avgExpensePerDay: number;
  largestExpense: number;
  /** Expenses + income entries; transfers are excluded. */
  count: number;
  spark: PeriodPoint[];
};

export type ForecastPoint = {
  date: string;
  balance: number;
  projected: boolean;
};

export type Forecast = {
  payday: number;
  daysToPayday: number;
  liquidBalanceUgx: number;
  dailyBurnUgx: number;
  projectedBalanceUgx: number;
  safePerDayUgx: number;
  bufferUgx: number;
  points: ForecastPoint[];
};

export type MomoFees = {
  month: number;
  period: number;
};

export type Goal = {
  id: string;
  name: string;
  targetUgx: number;
  savedUgx: number;
  deadline: string;
  color: string;
  note: string;
  createdAt: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  amountUgx: number;
  date: string;
  accountId?: string;
  note: string;
  createdAt: string;
};

export type Debt = {
  id: string;
  direction: "borrowed" | "lent";
  counterparty: string;
  principalUgx: number;
  balanceUgx: number;
  dueOn: string;
  note: string;
  createdAt: string;
};

export type DebtPayment = {
  id: string;
  debtId: string;
  amountUgx: number;
  date: string;
  accountId?: string;
  note: string;
  createdAt: string;
};

export type RecurringRun = {
  id: string;
  ruleId: string;
  amountUgx: number;
  date: string;
  createdAt: string;
};

export type PlanActivityKind =
  | "goal-contribution"
  | "debt-payment"
  | "recurring-run";

export type PlanActivity = {
  id: string;
  kind: PlanActivityKind;
  date: string;
  amountUgx: number;
  title: string;
  detail: string;
  accountName?: string;
  refId: string;
};

export type Budget = {
  id: string;
  name: string;
  categoryId: string;
  limitUgx: number;
  period: "monthly" | "weekly";
  color: string;
};

export type BudgetProgress = Budget & {
  spentUgx: number;
};

export type RecurringRule = {
  id: string;
  name: string;
  type: TransactionType;
  amountUgx: number;
  category: string;
  accountId: string;
  toAccountId?: string;
  frequency: "daily" | "weekly" | "monthly";
  nextOn: string;
  enabled: boolean;
  note: string;
};

export type HouseholdMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member" | "viewer";
  status: "active" | "invited";
};

export type NetWorth = {
  assets: number;
  liabilities: number;
  total: number;
  history: { date: string; value: number }[];
};

export type Stats = {
  month: string;
  monthLabel: string;
  period: PeriodStats;
  totals: {
    month: number;
    income: number;
    net: number;
    today: number;
    todayIncome: number;
    todayNet: number;
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
  daily30: DailyPoint[];
  cumulative: { date: string; spent: number; pace: number }[];
  weekday: { day: string; value: number }[];
  months: MonthTotal[];
  heat: { date: string; total: number; count: number }[];
  recent: Transaction[];
  accounts: AccountBalance[];
  forecast: Forecast;
  momoFees: MomoFees;
};
