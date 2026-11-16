import { addDays, ymd } from "./format";
import type { Account, Currency, Settings, TransactionType } from "./types";

export type QuickDraft = {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: string;
  accountId: string;
  toAccountId?: string;
  note: string;
  spentOn: string;
  needsReview: boolean;
};

type Options = {
  accounts: Account[];
  settings: Settings | null;
  now?: Date;
};

const INCOME_WORDS =
  /received|salary|earned|earning|income|freelance|forex|credited|got paid|bonus|refund|paid me/i;
const TRANSFER_WORDS = /transfer|moved|move |sent\b.*\bto\b|top.?up|withdraw|deposit/i;

const CATEGORY_WORDS: Record<string, RegExp> = {
  food: /food|lunch|dinner|breakfast|rolex|chapati|groceries|grocery|market|coffee|restaurant|matooke|beans|snack/i,
  transport: /boda|taxi|fuel|transport|matatu|uber|bus|fare|parking/i,
  bills: /rent|electricity|water|internet|airtime|netflix|bill|subscription|data|utilities/i,
  fun: /cinema|movie|night out|concert|spotify|game|drinks|party/i,
  shopping: /shoes|shirt|clothes|phone|headphones|shopping|supermarket|kitchen/i,
  health: /pharmacy|clinic|gym|medicine|doctor|health|hospital/i,
};

const INCOME_CATEGORY_WORDS: Record<string, RegExp> = {
  salary: /salary|payroll|wage/i,
  freelance: /freelance|client|gig|contract/i,
  forex: /forex|dollar|exchange|usd/i,
  "side-hustle": /hustle|business|shop|sales/i,
  gift: /gift|bonus|refund|cashback/i,
};

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function cleanNote(clause: string): string {
  const text = clause
    .replace(/(\$|usd|ugx)?\s*[\d][\d,]*(?:\.\d+)?\s*(k|m|thousand|million)?/gi, " ")
    .replace(
      /\b(today|yesterday|on|last|this|paid|spent|bought|received|got|earned|transferred|moved|sent|to|from|for)\b/gi,
      " ",
    )
    .replace(/\b\d{1,2}(st|nd|rd|th)?\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s&'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function parseDate(clause: string, now: Date): string {
  const lower = clause.toLowerCase();
  if (/\byesterday\b/.test(lower)) return ymd(addDays(now, -1));
  if (/\btoday\b/.test(lower)) return ymd(now);

  const weekday = lower.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[1]);
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const delta = (date.getDay() - target + 7) % 7;
    return ymd(addDays(date, -delta));
  }

  const dayMonth = lower.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
  if (dayMonth) {
    const date = new Date(now.getFullYear(), MONTHS.indexOf(dayMonth[2]), Number(dayMonth[1]));
    if (date > now) date.setFullYear(date.getFullYear() - 1);
    return ymd(date);
  }

  const monthDay = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})\b/);
  if (monthDay) {
    const date = new Date(now.getFullYear(), MONTHS.indexOf(monthDay[1]), Number(monthDay[2]));
    if (date > now) date.setFullYear(date.getFullYear() - 1);
    return ymd(date);
  }

  return ymd(now);
}

function findAccount(
  text: string,
  accounts: Account[],
): Account | undefined {
  const lower = text.toLowerCase();
  const byName = accounts.find((account) => lower.includes(account.name.toLowerCase()));
  if (byName) return byName;
  if (/airtel/.test(lower)) {
    return accounts.find(
      (account) => account.type === "momo" && /airtel/i.test(`${account.provider ?? ""} ${account.name}`),
    );
  }
  if (/momo|mtn/.test(lower)) {
    return accounts.find(
      (account) => account.type === "momo" && /mtn/i.test(`${account.provider ?? ""} ${account.name}`),
    );
  }
  if (/bank/.test(lower)) return accounts.find((account) => account.type === "bank");
  if (/cash/.test(lower)) return accounts.find((account) => account.type === "cash");
  return undefined;
}

function categoryFor(text: string, type: TransactionType): string {
  const lower = text.toLowerCase();
  if (type === "income") {
    for (const [id, pattern] of Object.entries(INCOME_CATEGORY_WORDS)) {
      if (pattern.test(lower)) return id;
    }
    return "other-income";
  }
  for (const [id, pattern] of Object.entries(CATEGORY_WORDS)) {
    if (pattern.test(lower)) return id;
  }
  return "other";
}

function parseAmount(clause: string, defaultCurrency: Currency): { amount: number; currency: Currency } {
  const matches = Array.from(
    clause.matchAll(/(\$|usd|ugx)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?/gi),
  );
  let amount = 0;
  let currency = defaultCurrency;

  for (const match of matches) {
    const raw = Number(match[2].replace(/,/g, ""));
    const suffix = match[3]?.toLowerCase();
    const multiplier =
      suffix === "k" || suffix === "thousand"
        ? 1_000
        : suffix === "m" || suffix === "million"
          ? 1_000_000
          : 1;
    const looksLikeYear = !suffix && !match[1] && raw >= 1900 && raw <= 2100;
    if (looksLikeYear && matches.length > 1) continue;
    const value = raw * multiplier;
    if (value > amount) {
      amount = value;
      currency =
        match[1]?.toLowerCase() === "usd" || match[1] === "$"
          ? "USD"
          : defaultCurrency;
    }
  }

  return { amount, currency };
}

export function parseQuickAdd(text: string, options: Options): QuickDraft[] {
  const { accounts, settings } = options;
  const now = options.now ?? new Date();
  const defaultAccountId =
    settings?.defaultAccountId ?? accounts[0]?.id ?? "";
  const defaultCurrency = settings?.defaultCurrency ?? "UGX";
  const clauses = text
    .split(/\n|;|,|\band\b/gi)
    .map((clause) => clause.trim())
    .filter(Boolean);

  return clauses.map((clause, index) => {
    const lower = clause.toLowerCase();
    const transfer = TRANSFER_WORDS.test(lower);
    const income = !transfer && INCOME_WORDS.test(lower);
    const type: TransactionType = transfer ? "transfer" : income ? "income" : "expense";
    const { amount, currency } = parseAmount(clause, defaultCurrency);
    const hinted = findAccount(clause, accounts);

    let accountId = hinted?.id ?? defaultAccountId;
    let toAccountId: string | undefined;
    if (type === "transfer") {
      const toHint = clause.match(/\b(?:to|into|towards)\s+(.+)$/i)?.[1] ?? "";
      const destination = findAccount(toHint, accounts) ?? hinted;
      if (destination && destination.id !== accountId) {
        toAccountId = destination.id;
      } else {
        toAccountId = accounts.find((account) => account.id !== accountId)?.id;
      }
      if (destination && destination.id === accountId) {
        accountId = accounts.find((account) => account.id !== destination.id)?.id ?? accountId;
      }
    }

    const category = type === "transfer" ? "" : categoryFor(clause, type);
    const note = cleanNote(clause) || (type === "transfer" ? "Transfer" : category);
    const needsReview =
      amount <= 0 ||
      (type === "transfer" && !toAccountId) ||
      (type !== "transfer" &&
        (category === "other" || category === "other-income"));

    return {
      id: `draft-${index}-${now.getTime()}`,
      type,
      amount,
      currency,
      category,
      accountId,
      toAccountId,
      note,
      spentOn: parseDate(clause, now),
      needsReview,
    };
  });
}
