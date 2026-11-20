import { addDays, ymd } from "./format";
import type {
  Budget,
  Debt,
  Goal,
  HouseholdMember,
  IncomeSource,
  RecurringRule,
} from "./types";

function nextDayOfMonth(day: number, now = new Date()): string {
  const thisMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()),
  );
  const date =
    thisMonth > now
      ? thisMonth
      : new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          Math.min(day, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()),
        );
  return ymd(date);
}

export function createGoals(): Goal[] {
  const createdAt = new Date().toISOString();
  return [
    {
      id: "goal_0001",
      name: "Emergency fund",
      targetUgx: 3_000_000,
      savedUgx: 1_200_000,
      deadline: "2027-06-30",
      color: "oklch(0.7 0.15 155)",
      note: "Six months of breathing room",
      createdAt,
    },
    {
      id: "goal_0002",
      name: "New laptop",
      targetUgx: 2_500_000,
      savedUgx: 650_000,
      deadline: "2027-03-31",
      color: "oklch(0.7 0.13 220)",
      note: "Something that compiles faster",
      createdAt,
    },
    {
      id: "goal_0003",
      name: "Zanzibar trip",
      targetUgx: 1_800_000,
      savedUgx: 300_000,
      deadline: "2027-12-15",
      color: "oklch(0.72 0.16 350)",
      note: "Flights, beach, no laptop",
      createdAt,
    },
  ];
}

export function createDebts(): Debt[] {
  const createdAt = new Date().toISOString();
  return [
    {
      id: "debt_0001",
      direction: "borrowed",
      counterparty: "Mum",
      principalUgx: 500_000,
      balanceUgx: 300_000,
      dueOn: "2026-12-31",
      note: "Transport loan",
      createdAt,
    },
    {
      id: "debt_0002",
      direction: "lent",
      counterparty: "Brian",
      principalUgx: 200_000,
      balanceUgx: 150_000,
      dueOn: "2026-11-30",
      note: "Lunch money",
      createdAt,
    },
    {
      id: "debt_0003",
      direction: "borrowed",
      counterparty: "SACCO",
      principalUgx: 1_000_000,
      balanceUgx: 600_000,
      dueOn: "2027-03-31",
      note: "Business stock",
      createdAt,
    },
    {
      id: "debt_0004",
      direction: "lent",
      counterparty: "Aisha",
      principalUgx: 100_000,
      balanceUgx: 100_000,
      dueOn: "2026-12-15",
      note: "Airtime and data",
      createdAt,
    },
  ];
}

export function createBudgets(): Budget[] {
  return [
    {
      id: "budget_0001",
      name: "Overall",
      categoryId: "all",
      limitUgx: 3_000_000,
      period: "monthly",
      color: "oklch(0.56 0.14 152)",
    },
    {
      id: "budget_0002",
      name: "Food",
      categoryId: "food",
      limitUgx: 800_000,
      period: "monthly",
      color: "oklch(0.74 0.16 62)",
    },
    {
      id: "budget_0003",
      name: "Transport",
      categoryId: "transport",
      limitUgx: 350_000,
      period: "monthly",
      color: "oklch(0.72 0.13 215)",
    },
    {
      id: "budget_0004",
      name: "Fun",
      categoryId: "fun",
      limitUgx: 250_000,
      period: "monthly",
      color: "oklch(0.73 0.18 350)",
    },
  ];
}

export function createRecurring(): RecurringRule[] {
  return [
    {
      id: "rec_0001",
      name: "Rent",
      type: "expense",
      amountUgx: 900_000,
      category: "bills",
      accountId: "acc_bank",
      frequency: "monthly",
      nextOn: nextDayOfMonth(1),
      enabled: true,
      note: "Monthly rent",
    },
    {
      id: "rec_0002",
      name: "Internet",
      type: "expense",
      amountUgx: 120_000,
      category: "bills",
      accountId: "acc_bank",
      frequency: "monthly",
      nextOn: nextDayOfMonth(5),
      enabled: true,
      note: "Home internet",
    },
    {
      id: "rec_0003",
      name: "Spotify",
      type: "expense",
      amountUgx: 20_000,
      category: "fun",
      accountId: "acc_mtn",
      frequency: "monthly",
      nextOn: ymd(new Date()),
      enabled: true,
      note: "Music subscription",
    },
    {
      id: "rec_0004",
      name: "Salary",
      type: "income",
      amountUgx: 2_800_000,
      category: "salary",
      accountId: "acc_bank",
      frequency: "monthly",
      nextOn: nextDayOfMonth(28),
      enabled: true,
      note: "Monthly salary",
    },
    {
      id: "rec_0005",
      name: "MoMo top-up",
      type: "transfer",
      amountUgx: 150_000,
      category: "",
      accountId: "acc_bank",
      toAccountId: "acc_mtn",
      frequency: "weekly",
      nextOn: ymd(addDays(new Date(), 2)),
      enabled: true,
      note: "Weekly wallet top-up",
    },
  ];
}

export function createIncomeSources(): IncomeSource[] {
  const createdAt = new Date().toISOString();
  return [
    {
      id: "income_0001",
      name: "Monthly salary",
      categoryId: "salary",
      accountId: "acc_bank",
      expectedMonthlyUgx: 2_800_000,
      cadence: "fixed",
      payday: 28,
      active: true,
      createdAt,
    },
    {
      id: "income_0002",
      name: "Freelance work",
      categoryId: "freelance",
      accountId: "acc_bank",
      expectedMonthlyUgx: 400_000,
      cadence: "irregular",
      active: true,
      createdAt,
    },
    {
      id: "income_0003",
      name: "Forex deals",
      categoryId: "forex",
      accountId: "acc_mtn",
      expectedMonthlyUgx: 200_000,
      cadence: "irregular",
      active: true,
      createdAt,
    },
    {
      id: "income_0004",
      name: "Side hustle",
      categoryId: "side-hustle",
      accountId: "acc_mtn",
      expectedMonthlyUgx: 100_000,
      cadence: "irregular",
      active: true,
      createdAt,
    },
  ];
}

export function createMembers(): HouseholdMember[] {  return [
    {
      id: "member_0001",
      name: "Mubarak",
      email: "bmubs15@gmail.com",
      role: "owner",
      status: "active",
    },
    {
      id: "member_0002",
      name: "Aisha",
      email: "aisha@example.com",
      role: "member",
      status: "active",
    },
    {
      id: "member_0003",
      name: "Brian",
      email: "brian@example.com",
      role: "viewer",
      status: "invited",
    },
  ];
}
