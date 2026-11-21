import type { AccountType, Currency } from "@/lib/types";

export const STEPS = [
  "welcome",
  "name",
  "currency",
  "account",
  "budget",
  "payday",
  "done",
] as const;

export type Step = (typeof STEPS)[number];

export type OnboardingDraft = {
  name?: string;
  currency?: Currency;
  accountName?: string;
  accountType?: AccountType;
  budget?: string;
  payday?: string;
};

/** Accents pulled from the dashboard's metric tones. */
export const STEP_META: Record<Step, { number: string; accent: string }> = {
  welcome: { number: "", accent: "oklch(0.70 0.17 15)" },
  name: { number: "01", accent: "oklch(0.74 0.16 62)" },
  currency: { number: "02", accent: "oklch(0.68 0.15 155)" },
  account: { number: "03", accent: "oklch(0.70 0.12 220)" },
  budget: { number: "04", accent: "oklch(0.68 0.17 296)" },
  payday: { number: "05", accent: "oklch(0.79 0.14 85)" },
  done: { number: "", accent: "oklch(0.68 0.15 155)" },
};

export const DRAFT_KEY = "xpense-onboarding";
export const COMPLETE_KEY = "xpense-onboarding-complete";

export function isStep(value: string | null): value is Step {
  return value !== null && (STEPS as readonly string[]).includes(value);
}

export function stepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

export function readDraft(): OnboardingDraft {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as OnboardingDraft) : {};
  } catch {
    return {};
  }
}

export function saveDraft(patch: Partial<OnboardingDraft>) {
  try {
    const next = { ...readDraft(), ...patch };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  } catch {
    return { ...readDraft(), ...patch };
  }
}

export function isOnboarded(): boolean {
  try {
    return window.localStorage.getItem(COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded() {
  try {
    window.localStorage.setItem(COMPLETE_KEY, "1");
  } catch {
    // Onboarding will simply run again next time.
  }
}

/** First question that still needs an answer, or null when everything is set. */
export function firstIncomplete(draft: OnboardingDraft): Step | null {
  if (!draft.name?.trim()) return "name";
  if (!draft.currency) return "currency";
  if (!draft.accountName?.trim() || !draft.accountType) return "account";
  return null;
}
