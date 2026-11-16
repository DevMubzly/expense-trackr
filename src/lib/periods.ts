import type { StatPeriod } from "./types";

export const STAT_PERIODS = [
  "all",
  "today",
  "7d",
  "30d",
  "90d",
  "6m",
  "1y",
] as const satisfies readonly StatPeriod[];

/** Short labels for the timeframe picker. */
export const PERIOD_OPTIONS: { value: StatPeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "Year" },
];

/** Labels used by the metric cards. */
export const PERIOD_LABELS: Record<StatPeriod, string> = {
  all: "All time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "6m": "Last 6 months",
  "1y": "Last year",
};

export function isStatPeriod(value: string | null | undefined): value is StatPeriod {
  return value != null && (STAT_PERIODS as readonly string[]).includes(value);
}
