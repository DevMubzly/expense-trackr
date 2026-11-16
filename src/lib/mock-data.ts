import { EXPENSE_CATEGORIES } from "./categories";
import { addDays, ymd } from "./format";
import type { Account, Settings, Transaction } from "./types";

export const USD_RATE = 3720;
export const DAYS_OF_HISTORY = 240;

export const ACCOUNTS: Account[] = [
  {
    id: "acc_cash",
    name: "Cash",
    type: "cash",
    color: "oklch(0.72 0.08 80)",
    openingBalanceUgx: 250_000,
  },
  {
    id: "acc_bank",
    name: "Stanbic Bank",
    type: "bank",
    color: "oklch(0.68 0.12 250)",
    openingBalanceUgx: 1_500_000,
  },
  {
    id: "acc_mtn",
    name: "MTN MoMo",
    type: "momo",
    provider: "MTN",
    color: "oklch(0.78 0.15 92)",
    openingBalanceUgx: 400_000,
  },
  {
    id: "acc_airtel",
    name: "Airtel Money",
    type: "momo",
    provider: "Airtel",
    color: "oklch(0.66 0.18 25)",
    openingBalanceUgx: 200_000,
  },
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTES: Record<string, string[]> = {
  food: ["Rolex + tea", "Lunch at the canteen", "Groceries", "Matooke & beans", "Coffee", "Chapati stand", "Dinner out", "Market run"],
  transport: ["Boda to work", "Taxi fare", "Fuel", "Special hire", "Boda to town", "Matatu"],
  bills: ["Electricity", "Water", "Internet", "Airtime", "Rent top-up", "Netflix"],
  fun: ["Cinema", "Night out", "Concert ticket", "Spotify", "Games"],
  shopping: ["Shoes", "Phone case", "Supermarket", "Shirt", "Kitchen stuff", "Headphones"],
  health: ["Pharmacy", "Clinic visit", "Gym", "Vitamins"],
  other: ["Misc", "Gift", "Donation", "Repair", "Data bundle"],
};

const AMOUNTS: Record<string, [number, number]> = {
  food: [4000, 32000],
  transport: [2000, 18000],
  bills: [25000, 160000],
  fun: [8000, 70000],
  shopping: [10000, 140000],
  health: [6000, 55000],
  other: [2000, 25000],
};

const WEIGHTS: Record<string, number> = {
  food: 3.2,
  transport: 2.4,
  fun: 0.7,
  shopping: 0.5,
  health: 0.15,
  other: 0.5,
};

const CATEGORY_IDS = EXPENSE_CATEGORIES.map((category) => category.id);
const MOMO_ACCOUNTS = ["acc_mtn", "acc_airtel"];

function pickWeighted(rand: () => number, weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rand() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return entries[0][0];
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function accountForCategory(categoryId: string, rand: () => number): string {
  if (categoryId === "bills") return rand() < 0.72 ? "acc_bank" : "acc_mtn";
  if (categoryId === "food" || categoryId === "transport") {
    const roll = rand();
    if (roll < 0.55) return "acc_mtn";
    if (roll < 0.9) return "acc_cash";
    return "acc_airtel";
  }
  const roll = rand();
  if (roll < 0.4) return "acc_mtn";
  if (roll < 0.7) return "acc_bank";
  return "acc_cash";
}

export function createTransactions(): Transaction[] {
  const rand = mulberry32(20261115);
  const today = new Date();
  const transactions: Transaction[] = [];
  let counter = 0;

  const push = (
    date: Date,
    categoryId: string,
    amountUgx: number,
    currency: "UGX" | "USD",
    options: {
      type?: "expense" | "income" | "transfer";
      accountId?: string;
      toAccountId?: string;
      note?: string;
      feeUgx?: number;
      source?: Transaction["source"];
    } = {},
  ) => {
    const type = options.type ?? "expense";
    const accountId = options.accountId ?? "acc_mtn";
    const [lo, hi] = AMOUNTS[categoryId] ?? AMOUNTS.other;
    const ugx =
      amountUgx || (type === "income" ? roundTo(lo + rand() * (hi - lo), 500) : roundTo(lo + rand() * (hi - lo), 500));
    const notes = NOTES[categoryId] ?? NOTES.other;
    const day = ymd(date);
    const hour = type === "income" ? 8 : 7 + Math.floor(rand() * 14);
    const minute = Math.floor(rand() * 60);
    counter += 1;
    transactions.push({
      id: `txn_${String(counter).padStart(4, "0")}`,
      type,
      amount: currency === "USD" ? Math.round((ugx / USD_RATE) * 100) / 100 : ugx,
      currency,
      amountUgx: ugx,
      usdRate: USD_RATE,
      category: type === "transfer" ? "" : categoryId,
      accountId,
      toAccountId: options.toAccountId,
      feeUgx: options.feeUgx,
      note: options.note ?? (type === "income" ? categoryId : notes[Math.floor(rand() * notes.length)]),
      spentOn: day,
      createdAt: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        minute,
      ).toISOString(),
      source: options.source ?? "manual",
    });
  };

  for (let offset = DAYS_OF_HISTORY; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const weekday = date.getDay();
    const weekend = weekday === 0 || weekday === 6;
    const count = 2 + Math.floor(rand() * (weekend ? 4 : 3));

    // Every day starts with something edible.
    const foodAccount = accountForCategory("food", rand);
    push(date, "food", 0, "UGX", {
      accountId: foodAccount,
      feeUgx: MOMO_ACCOUNTS.includes(foodAccount) && rand() > 0.72 ? roundTo(300 + rand() * 1200, 100) : undefined,
    });

    for (let i = 1; i < count; i += 1) {
      const categoryId = pickWeighted(rand, WEIGHTS);
      const accountId = accountForCategory(categoryId, rand);
      push(date, categoryId, 0, "UGX", {
        accountId,
        feeUgx:
          MOMO_ACCOUNTS.includes(accountId) && rand() > 0.78
            ? roundTo(300 + rand() * 1600, 100)
            : undefined,
      });
    }

    // Recurring bills land twice a month.
    const day = date.getDate();
    if (day === 3 || day === 18) {
      push(date, "bills", 0, "UGX", { accountId: "acc_bank" });
      if (rand() > 0.55) push(date, "bills", 0, "UGX", { accountId: "acc_mtn" });
    }

    // The occasional dollar purchase.
    if (rand() > 0.94) {
      const usd = 3 + rand() * 17;
      const categoryId = CATEGORY_IDS[Math.floor(rand() * CATEGORY_IDS.length)];
      push(date, categoryId, Math.round(usd * USD_RATE), "USD", {
        accountId: rand() > 0.5 ? "acc_mtn" : "acc_bank",
        feeUgx: rand() > 0.5 ? roundTo(500 + rand() * 1500, 100) : undefined,
      });
    }

    // Salary lands on the 28th.
    if (day === 28) {
      push(date, "salary", roundTo(2_600_000 + rand() * 800_000, 50_000), "UGX", {
        type: "income",
        accountId: "acc_bank",
        note: "Monthly salary",
        source: "recurring",
      });
    }

    // Freelance and forex income keep the picture irregular.
    if (rand() > 0.9) {
      push(date, rand() > 0.6 ? "freelance" : "forex", roundTo(120_000 + rand() * 680_000, 10_000), "UGX", {
        type: "income",
        accountId: rand() > 0.5 ? "acc_bank" : "acc_mtn",
        note: rand() > 0.6 ? "Freelance payment" : "Forex deal",
      });
    }

    if (rand() > 0.94) {
      push(date, "side-hustle", roundTo(40_000 + rand() * 180_000, 5_000), "UGX", {
        type: "income",
        accountId: "acc_mtn",
        note: "Side hustle",
      });
    }

    // Weekly top-up from the bank into MoMo.
    if (weekday === 1) {
      push(date, "", 150_000, "UGX", {
        type: "transfer",
        accountId: "acc_bank",
        toAccountId: "acc_mtn",
        note: "MoMo top-up",
      });
    }

    // Keep cash and Airtel funded from the bank.
    if (weekday === 3) {
      push(date, "", 180_000, "UGX", {
        type: "transfer",
        accountId: "acc_bank",
        toAccountId: "acc_cash",
        note: "Cash top-up",
      });
    }
    if (weekday === 2 && rand() > 0.5) {
      push(date, "", 80_000, "UGX", {
        type: "transfer",
        accountId: "acc_bank",
        toAccountId: "acc_airtel",
        note: "Airtel top-up",
      });
    }

    // Occasional cash withdrawal from MoMo.
    if (weekday === 5 && rand() > 0.55) {
      push(date, "", 50_000, "UGX", {
        type: "transfer",
        accountId: "acc_mtn",
        toAccountId: "acc_cash",
        note: "Cash withdrawal",
        feeUgx: roundTo(500 + rand() * 1000, 100),
      });
    }
  }

  return transactions.sort((a, b) => {
    if (a.spentOn !== b.spentOn) return a.spentOn < b.spentOn ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function createSettings(defaultAccountId = "acc_mtn"): Settings {
  return {
    monthlyBudget: 3_000_000,
    usdRate: USD_RATE,
    defaultCurrency: "UGX",
    defaultAccountId,
    payday: 28,
    forecastBufferUgx: 200_000,
    weekPlan: {
      mon: { enabled: true, ranges: [{ id: "mon-1", start: "09:00", end: "17:00" }] },
      tue: { enabled: true, ranges: [{ id: "tue-1", start: "09:00", end: "17:00" }] },
      wed: { enabled: true, ranges: [{ id: "wed-1", start: "09:00", end: "17:00" }] },
      thu: { enabled: true, ranges: [{ id: "thu-1", start: "09:00", end: "17:00" }] },
      fri: { enabled: true, ranges: [{ id: "fri-1", start: "09:00", end: "18:00" }] },
      sat: { enabled: false, ranges: [] },
      sun: { enabled: false, ranges: [] },
    },
  };
}

/** Kept for older imports. */
export function createExpenses(): Transaction[] {
  return createTransactions();
}
