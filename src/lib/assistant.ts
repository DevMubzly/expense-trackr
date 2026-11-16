import { formatNumber, parseYmd } from "./format";
import type { Debt, Goal, Stats } from "./types";

export type AssistantAnswer = {
  title: string;
  lines: string[];
  tone?: "default" | "positive" | "warning";
};

type Context = {
  stats: Stats | null;
  goals: Goal[];
  debts: Debt[];
};

const CATEGORY_WORDS: { id: string; words: string[] }[] = [
  { id: "food", words: ["food", "groceries", "rolex", "lunch", "dinner", "market"] },
  { id: "transport", words: ["transport", "boda", "taxi", "fuel", "bus"] },
  { id: "bills", words: ["bills", "rent", "electricity", "water", "internet", "airtime"] },
  { id: "fun", words: ["fun", "entertainment", "cinema", "spotify", "games"] },
  { id: "shopping", words: ["shopping", "shoes", "clothes", "phone"] },
  { id: "health", words: ["health", "pharmacy", "clinic", "gym"] },
];

function parseAmount(text: string): number | null {
  const matches = Array.from(
    text.matchAll(/(\$|usd|ugx)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?/gi),
  );
  let amount = 0;
  for (const match of matches) {
    const raw = Number(match[2].replace(/,/g, ""));
    const suffix = match[3]?.toLowerCase();
    const multiplier =
      suffix === "k" || suffix === "thousand"
        ? 1_000
        : suffix === "m" || suffix === "million"
          ? 1_000_000
          : 1;
    const value = raw * multiplier;
    const looksLikeYear = !suffix && !match[1] && raw >= 1900 && raw <= 2100;
    if (looksLikeYear && matches.length > 1) continue;
    amount = Math.max(amount, value);
  }
  return amount > 0 ? amount : null;
}

function findCategory(question: string): string | null {
  const lower = question.toLowerCase();
  return CATEGORY_WORDS.find((entry) => entry.words.some((word) => lower.includes(word)))?.id ?? null;
}

function monthsUntil(deadline: string): number {
  const date = parseYmd(deadline);
  const now = new Date();
  return Math.max(
    1,
    (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth(),
  );
}

function ugx(value: number): string {
  return `UGX ${formatNumber(value)}`;
}

export function answerQuestion(question: string, context: Context): AssistantAnswer {
  const { stats, goals, debts } = context;
  const lower = question.toLowerCase().trim();
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!stats) {
    return {
      title: "Still loading your ledger",
      lines: ["Give it a moment, then ask again."],
    };
  }

  const borrowed = debts
    .filter((debt) => debt.direction === "borrowed")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const lent = debts
    .filter((debt) => debt.direction === "lent")
    .reduce((total, debt) => total + debt.balanceUgx, 0);

  if (/afford|can i buy|should i buy/.test(lower)) {
    const amount = parseAmount(lower);
    if (!amount) {
      return {
        title: "How much is it?",
        lines: ["Tell me the amount, for example: “Can I afford 300k?”"],
      };
    }
    const available =
      stats.forecast.projectedBalanceUgx - stats.forecast.bufferUgx;
    const affordable = amount <= available;
    return {
      title: affordable ? "Yes, it looks affordable" : "That would stretch you",
      tone: affordable ? "positive" : "warning",
      lines: [
        `${ugx(amount)} ${affordable ? "sits inside" : "is above"} your projected balance of ${ugx(
          Math.max(0, available),
        )} after the buffer.`,
        `Your safe-to-spend is about ${ugx(stats.forecast.safePerDayUgx)} per day for the next ${stats.forecast.daysToPayday} days, with ${ugx(
          stats.forecast.liquidBalanceUgx,
        )} liquid across your accounts.`,
      ],
    };
  }

  if (/wast|leak|overspend|spending too much/.test(lower)) {
    const discretionary = stats.byCategory
      .filter((entry) => ["fun", "shopping", "other"].includes(entry.id))
      .sort((a, b) => b.value - a.value);
    const total = discretionary.reduce((sum, entry) => sum + entry.value, 0);
    if (!discretionary.length) {
      return {
        title: "Nothing obvious is leaking",
        lines: [`${stats.monthLabel} has no discretionary spend recorded yet.`],
      };
    }
    return {
      title: "The soft spots",
      lines: discretionary.slice(0, 3).map(
        (entry) =>
          `${entry.label}: ${ugx(entry.value)} (${Math.round(
            (entry.value / Math.max(1, stats.totals.month)) * 100,
          )}% of this month's spend).`,
      ).concat(
        total > 0
          ? [`Fun, shopping and other add up to ${ugx(total)} this month.`]
          : [],
      ),
    };
  }

  if (/goal|target|save for|saving for/.test(lower)) {
    const named = goals.find((goal) =>
      lower.includes(goal.name.toLowerCase().replace(/\s+/g, " ")),
    );
    const goal = named ?? goals[0];
    if (!goal) {
      return {
        title: "No goals yet",
        lines: ["Add a savings goal on the Plan page and I can do the math for you."],
      };
    }
    const remaining = Math.max(0, goal.targetUgx - goal.savedUgx);
    const months = monthsUntil(goal.deadline);
    return {
      title: goal.name,
      lines: [
        `You have ${ugx(goal.savedUgx)} of ${ugx(goal.targetUgx)} — ${Math.round(
          (goal.savedUgx / Math.max(1, goal.targetUgx)) * 100,
        )}% there.`,
        `That leaves ${ugx(remaining)} over ${months} month${months === 1 ? "" : "s"}.`,
        `Save about ${ugx(Math.round(remaining / months))} per month, or ${ugx(
          Math.round(remaining / (months * 2)),
        )} per payday if you are paid twice a month.`,
      ],
    };
  }

  if (/owe|debt|borrow|lend/.test(lower)) {
    const net = borrowed - lent;
    return {
      title: "Debt position",
      lines: [
        `You owe ${ugx(borrowed)}.`,
        `You are owed ${ugx(lent)}.`,
        net >= 0
          ? `Net: ${ugx(net)} more owed than lent.`
          : `Net: ${ugx(-net)} more lent than owed.`,
      ],
      tone: net > 0 ? "warning" : "default",
    };
  }

  if (/payday|safe to spend|left|remaining/.test(lower)) {
    return {
      title: "Until payday",
      lines: [
        `You have ${ugx(stats.forecast.liquidBalanceUgx)} liquid.`,
        `Safe to spend: about ${ugx(stats.forecast.safePerDayUgx)} per day for ${stats.forecast.daysToPayday} days.`,
        `Projected balance at payday: ${ugx(stats.forecast.projectedBalanceUgx)} after your ${ugx(
          stats.forecast.bufferUgx,
        )} buffer.`,
      ],
    };
  }

  if (/earn|income|salary/.test(lower)) {
    return {
      title: "Income this month",
      lines: [
        `You have recorded ${ugx(stats.totals.income)} of income in ${stats.monthLabel}.`,
        `Expenses are ${ugx(stats.totals.month)}, so net is ${ugx(stats.totals.net)}.`,
      ],
      tone: stats.totals.net >= 0 ? "positive" : "warning",
    };
  }

  if (/balance|how much money|net worth|have in/.test(lower)) {
    const assets =
      stats.accounts.reduce((total, account) => total + account.balanceUgx, 0) + lent;
    const liabilities = borrowed;
    return {
      title: "Your balance",
      lines: [
        `Liquid balance: ${ugx(stats.forecast.liquidBalanceUgx)}.`,
        `Net worth including debts: ${ugx(assets - liabilities)}.`,
        `That is ${ugx(assets)} in assets and ${ugx(liabilities)} in debts.`,
      ],
    };
  }

  const categoryId = findCategory(lower);
  if (categoryId && /spent|spend|how much/.test(lower)) {
    const entry = stats.byCategory.find((category) => category.id === categoryId);
    const value = entry?.value ?? 0;
    return {
      title: `${entry?.label ?? categoryId} in ${stats.monthLabel}`,
      lines: [
        `You have spent ${ugx(value)} on ${entry?.label ?? categoryId} this month.`,
        `That is ${Math.round((value / Math.max(1, stats.totals.month)) * 100)}% of ${ugx(
          stats.totals.month,
        )} total spend.`,
      ],
    };
  }

  if (/how much.*spent|total spend|spending this month/.test(lower)) {
    return {
      title: `${stats.monthLabel} so far`,
      lines: [
        `You have spent ${ugx(stats.totals.month)} across ${stats.totals.count} expense entries.`,
        `Average day: ${ugx(stats.totals.avgPerDay)}. Largest single: ${ugx(stats.totals.largest)}.`,
      ],
    };
  }

  if (/hello|hi|hey|help/.test(lower)) {
    return {
      title: `Hello — ${today}`,
      lines: [
        "Ask me about spending, income, goals, debts, affordability, or how much is safe to spend before payday.",
      ],
    };
  }

  return {
    title: "Here is the quick picture",
    lines: [
      `${stats.monthLabel}: ${ugx(stats.totals.month)} spent, ${ugx(stats.totals.income)} income, ${ugx(
        stats.totals.net,
      )} net.`,
      `Safe to spend: ${ugx(stats.forecast.safePerDayUgx)} per day for the next ${stats.forecast.daysToPayday} days.`,
      "Try asking: “How much did I spend on transport?”, “Can I afford 300k?”, or “Where am I wasting money?”",
    ],
  };
}
