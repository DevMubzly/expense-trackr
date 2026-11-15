import type { Currency } from "./types";

const nf = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

export function formatNumber(n: number): string {
  return nf.format(Math.round(n));
}

/** Compact UGX for axes and cards: UGX 1.24M */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 2)}M`;
  if (abs >= 100_000) return `${Math.round(n / 1000)}K`;
  if (abs >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return formatNumber(n);
}

export function formatUgx(n: number): string {
  return `UGX ${formatNumber(n)}`;
}

export function formatUgxCompact(n: number): string {
  return `UGX ${formatCompact(n)}`;
}

export function formatMoney(amount: number, currency: Currency): string {
  return currency === "UGX"
    ? `UGX ${formatNumber(amount)}`
    : `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** UGX per USD → the inverse the UI shows. */
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
  return parseYmd(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
