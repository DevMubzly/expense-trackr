import type { Currency } from "./types";

const nf = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

export function formatNumber(n: number): string {
  return nf.format(Math.round(n));
}

/** "UGX 555,000" for places that cannot use the Money component (toasts, aria). */
export function formatAmount(n: number, currency: Currency = "UGX"): string {
  return currency === "UGX"
    ? `UGX ${formatNumber(n)}`
    : `USD ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** Group digits in a free-form numeric input string while typing. */
export function formatNumericInput(value: string, allowDecimal = false): string {
  const cleaned = value.replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, "");
  if (!allowDecimal) {
    const normalized = cleaned.replace(/^0+(?=\d)/, "");
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const [whole = "", ...rest] = cleaned.split(".");
  const normalized = whole.replace(/^0+(?=\d)/, "");
  const decimals = rest.join("").slice(0, 2);
  const grouped = normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return rest.length > 0 ? `${grouped}.${decimals}` : grouped;
}

export function parseNumericInput(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toUsd(ugx: number, rate: number): number {
  return rate > 0 ? ugx / rate : 0;
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function monthKey(value: string | Date): string {
  const d = typeof value === "string" ? parseYmd(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
  });
}

export function monthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long" });
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function dayLabel(value: string): string {
  return parseYmd(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function relativeDay(value: string, today: string): string {
  if (value === today) return "Today";
  if (value === ymd(addDays(parseYmd(today), -1))) return "Yesterday";
  return parseYmd(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
