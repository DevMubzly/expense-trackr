import { CATEGORIES } from "./categories";
import { addDays, ymd } from "./format";
import type { Expense, Settings } from "./types";

export const USD_RATE = 3720;
export const DAYS_OF_HISTORY = 240;

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

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

function pickWeighted(rand: () => number, weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
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

export function createExpenses(): Expense[] {
  const rand = mulberry32(20261115);
  const today = new Date();
  const expenses: Expense[] = [];
  let counter = 0;

  const push = (date: Date, categoryId: string, amountUgx: number, currency: "UGX" | "USD") => {
    const [lo, hi] = AMOUNTS[categoryId] ?? AMOUNTS.other;
    const ugx = amountUgx || roundTo(lo + rand() * (hi - lo), 500);
    const notes = NOTES[categoryId] ?? NOTES.other;
    const day = ymd(date);
    const hour = 7 + Math.floor(rand() * 14);
    const minute = Math.floor(rand() * 60);
    counter += 1;
    expenses.push({
      id: `exp_${String(counter).padStart(4, "0")}`,
      amount: currency === "USD" ? Math.round((ugx / USD_RATE) * 100) / 100 : ugx,
      currency,
      amountUgx: ugx,
      usdRate: USD_RATE,
      category: categoryId,
      note: notes[Math.floor(rand() * notes.length)],
      spentOn: day,
      createdAt: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        minute,
      ).toISOString(),
    });
  };

  for (let offset = DAYS_OF_HISTORY; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const weekday = date.getDay();
    const weekend = weekday === 0 || weekday === 6;
    const count = 2 + Math.floor(rand() * (weekend ? 4 : 3));

    // Every day starts with something edible.
    push(date, "food", 0, "UGX");
    for (let i = 1; i < count; i += 1) {
      push(date, pickWeighted(rand, WEIGHTS), 0, "UGX");
    }

    // Recurring bills land twice a month.
    const day = date.getDate();
    if (day === 3 || day === 18) {
      push(date, "bills", 0, "UGX");
      if (rand() > 0.55) push(date, "bills", 0, "UGX");
    }

    // The occasional dollar purchase.
    if (rand() > 0.94) {
      const usd = 3 + rand() * 17;
      const categoryId = CATEGORY_IDS[Math.floor(rand() * CATEGORY_IDS.length)];
      push(date, categoryId, Math.round(usd * USD_RATE), "USD");
    }
  }

  return expenses.sort((a, b) => (a.spentOn < b.spentOn ? 1 : a.spentOn > b.spentOn ? -1 : 0));
}

export function createSettings(): Settings {
  return {
    monthlyBudget: 3_000_000,
    usdRate: USD_RATE,
    defaultCurrency: "UGX",
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
