"use client";

import {
  Suspense,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { BrandStrip } from "@/components/brand-strip";
import { Icon } from "@/components/huge-icon";
import { api } from "@/lib/use-api";
import { CURRENCY_META } from "@/lib/currencies";
import type { AccountType, Currency } from "@/lib/types";
import {
  STEP_META,
  firstIncomplete,
  isOnboarded,
  isStep,
  markOnboarded,
  readDraft,
  saveDraft,
  stepIndex,
  type OnboardingDraft,
  type Step,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const QUESTIONS = ["name", "currency", "account", "budget", "payday"] as const;
const CURRENCIES: Currency[] = ["UGX", "USD", "KES", "RWF", "TZS"];
const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "momo", label: "Mobile money" },
];

const EASE = [0.23, 1, 0.32, 1] as const;

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="dark min-h-dvh bg-background" />}>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("step");
  const step: Step = isStep(raw) ? raw : "welcome";

  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const stored = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(stored);

    if (isOnboarded()) {
      router.replace("/dashboard");
      return;
    }

    if (step !== "welcome" && step !== "done") {
      const missing = firstIncomplete(stored);
      if (missing && stepIndex(step) > stepIndex(missing)) {
        router.replace(`/onboarding?step=${missing}`);
        return;
      }
    }

    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(next: Step) {
    setDirection(stepIndex(next) >= stepIndex(step) ? 1 : -1);
    setError(undefined);
    router.push(`/onboarding?step=${next}`);
  }

  function update(patch: Partial<OnboardingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    saveDraft(patch);
  }

  async function finish(patch: Partial<OnboardingDraft>) {
    const merged = { ...draft, ...patch };
    update(patch);

    if (!merged.name || !merged.currency || !merged.accountName || !merged.accountType) {
      go(firstIncomplete(merged) ?? "name");
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await api.post("/api/onboarding", {
        name: merged.name,
        currency: merged.currency,
        accountName: merged.accountName,
        accountType: merged.accountType,
        budget: Number(merged.budget ?? 0),
        payday: merged.payday ? Number(merged.payday) : undefined,
      });
      markOnboarded();
      go("done");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <div className="dark min-h-dvh bg-background" />;
  }

  const meta = STEP_META[step];
  const progress = QUESTIONS.indexOf(step as (typeof QUESTIONS)[number]);

  const variants = reduce
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (dir: number) => ({ opacity: 0, x: dir * 26 }),
        center: { opacity: 1, x: 0 },
        exit: (dir: number) => ({ opacity: 0, x: dir * -26 }),
      };

  return (
    <div
      className="dark flex min-h-dvh flex-col bg-background text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-6 pb-16 pt-[18vh]">
        <div className="mb-10 h-1">
          {progress >= 0 ? (
            <div className="flex gap-1.5">
              {QUESTIONS.map((question, position) => (
                <span
                  key={question}
                  className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{
                    background:
                      position <= progress
                        ? meta.accent
                        : "color-mix(in oklab, var(--foreground) 10%, transparent)",
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-h-[360px]">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: EASE }}
            >
              {step === "welcome" ? (
                <Welcome onStart={() => go("name")} />
              ) : null}

              {step === "name" ? (
                <Question
                  number={meta.number}
                  accent={meta.accent}
                  title="What should we call you?"
                  hint="First name is fine."
                  onSubmit={(value) => {
                    if (!value.trim()) {
                      setError("Please type your name.");
                      return;
                    }
                    update({ name: value.trim() });
                    go("currency");
                  }}
                  initial={draft.name ?? ""}
                  placeholder="Your name"
                  error={error}
                  buttonLabel="OK"
                  autoFocus
                />
              ) : null}

              {step === "currency" ? (
                <CurrencyStep
                  number={meta.number}
                  accent={meta.accent}
                  value={draft.currency ?? "UGX"}
                  onNext={(currency) => {
                    update({ currency });
                    go("account");
                  }}
                />
              ) : null}

              {step === "account" ? (
                <AccountStep
                  number={meta.number}
                  accent={meta.accent}
                  draft={draft}
                  error={error}
                  onNext={(accountName, accountType) => {
                    if (!accountName.trim()) {
                      setError("Give the account a name.");
                      return;
                    }
                    update({ accountName: accountName.trim(), accountType });
                    go("budget");
                  }}
                />
              ) : null}

              {step === "budget" ? (
                <BudgetStep
                  number={meta.number}
                  accent={meta.accent}
                  currency={draft.currency ?? "UGX"}
                  initial={draft.budget ?? ""}
                  onNext={(budget) => {
                    update({ budget });
                    go("payday");
                  }}
                />
              ) : null}

              {step === "payday" ? (
                <PaydayStep
                  number={meta.number}
                  accent={meta.accent}
                  initial={draft.payday ?? ""}
                  saving={saving}
                  error={error}
                  onFinish={(payday) => finish({ payday })}
                />
              ) : null}

              {step === "done" ? (
                <Done
                  accent={meta.accent}
                  draft={draft}
                  onOpen={() => router.replace("/dashboard")}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-center pb-8">
        <BrandStrip />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="w-full text-center">
      <h1 className="font-display text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">
        Money, one clear picture.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        A couple of questions so the first screen makes sense. Takes about two
        minutes, and you can change everything later.
      </p>
      <div className="mt-8 flex justify-center">
        <AccentButton accent={STEP_META.welcome.accent} onClick={onStart}>
          Let&apos;s go
        </AccentButton>
      </div>
    </div>
  );
}

function Question({
  number,
  accent,
  title,
  hint,
  initial,
  placeholder,
  error,
  buttonLabel,
  autoFocus,
  onSubmit,
}: {
  number: string;
  accent: string;
  title: string;
  hint: string;
  initial: string;
  placeholder: string;
  error?: string;
  buttonLabel: string;
  autoFocus?: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
      <p className="text-[13px] font-medium" style={{ color: accent }}>
        {number}.
      </p>
      <h1 className="mt-2 font-display text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
        {title}*
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>

      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit(value);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="mt-8 w-full border-b-2 border-border bg-transparent pb-2 text-xl outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-[var(--accent)]"
        style={{ caretColor: accent }}
      />

      {error ? <p className="mt-2 text-[12px] text-destructive">{error}</p> : null}

      <div className="mt-6">
        <AccentButton accent={accent} onClick={() => onSubmit(value)}>
          {buttonLabel}
        </AccentButton>
      </div>
    </div>
  );
}

function CurrencyStep({
  number,
  accent,
  value,
  onNext,
}: {
  number: string;
  accent: string;
  value: Currency;
  onNext: (currency: Currency) => void;
}) {
  const [selected, setSelected] = useState<Currency>(value);

  return (
    <div className="max-w-[520px]">
      <p className="text-[13px] font-medium" style={{ color: accent }}>
        {number}.
      </p>
      <h1 className="mt-2 font-display text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
        What do you mostly spend in?*
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You can still log other currencies later.
      </p>

      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {CURRENCIES.map((currency) => {
          const active = currency === selected;
          const meta = CURRENCY_META[currency];
          return (
            <motion.button
              key={currency}
              type="button"
              aria-pressed={active}
              whileTap={{ scale: 0.985 }}
              onClick={() => setSelected(currency)}
              className={cn(
                "flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors",
                active
                  ? "text-foreground"
                  : "bg-muted/25 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              style={
                active
                  ? {
                      background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                    }
                  : undefined
              }
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background/40 text-[13px] font-semibold text-foreground">
                {meta.symbol}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {currency}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {meta.label}
                </span>
              </span>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full",
                  active ? "text-black" : "bg-muted/60",
                )}
                style={active ? { background: accent } : undefined}
              >
                {active ? (
                  <Icon icon={Tick02Icon} className="size-3" />
                ) : null}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-8">
        <AccentButton accent={accent} onClick={() => onNext(selected)}>
          OK
        </AccentButton>
      </div>
    </div>
  );
}

function AccountStep({
  number,
  accent,
  draft,
  error,
  onNext,
}: {
  number: string;
  accent: string;
  draft: OnboardingDraft;
  error?: string;
  onNext: (name: string, type: AccountType) => void;
}) {
  const [name, setName] = useState(draft.accountName ?? "");
  const [type, setType] = useState<AccountType>(draft.accountType ?? "cash");

  return (
    <div className="max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
      <p className="text-[13px] font-medium" style={{ color: accent }}>
        {number}.
      </p>
      <h1 className="mt-2 font-display text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
        Where does your money live?*
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start with the account you spend from most.
      </p>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onNext(name, type);
        }}
        placeholder="Cash wallet"
        autoFocus
        className="mt-8 w-full border-b-2 border-border bg-transparent pb-2 text-xl outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-[var(--accent)]"
        style={{ caretColor: accent }}
      />

      <div className="mt-5 flex flex-wrap gap-2">
        {ACCOUNT_TYPES.map((option) => {
          const active = option.value === type;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                active ? "text-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
              style={
                active
                  ? {
                      borderColor: accent,
                      background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                    }
                  : undefined
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-2 text-[12px] text-destructive">{error}</p> : null}

      <div className="mt-8">
        <AccentButton accent={accent} onClick={() => onNext(name, type)}>
          OK
        </AccentButton>
      </div>
    </div>
  );
}

function BudgetStep({
  number,
  accent,
  currency,
  initial,
  onNext,
}: {
  number: string;
  accent: string;
  currency: Currency;
  initial: string;
  onNext: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
      <p className="text-[13px] font-medium" style={{ color: accent }}>
        {number}.
      </p>
      <h1 className="mt-2 font-display text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
        What is a comfortable month?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A rough number is fine. This becomes your monthly budget.
      </p>

      <div className="mt-8 flex items-baseline gap-2 border-b-2 border-border pb-2 transition-colors focus-within:border-[var(--accent)]">
        <span className="text-sm font-medium text-muted-foreground">{currency}</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") onNext(value);
          }}
          placeholder="0"
          inputMode="numeric"
          autoFocus
          className="tnum w-full bg-transparent text-xl outline-none placeholder:text-muted-foreground/40"
          style={{ caretColor: accent }}
        />
      </div>

      <div className="mt-6">
        <AccentButton accent={accent} onClick={() => onNext(value)}>
          Set budget
        </AccentButton>
      </div>
    </div>
  );
}

function PaydayStep({
  number,
  accent,
  initial,
  saving,
  error,
  onFinish,
}: {
  number: string;
  accent: string;
  initial: string;
  saving: boolean;
  error?: string;
  onFinish: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
      <p className="text-[13px] font-medium" style={{ color: accent }}>
        {number}.
      </p>
      <h1 className="mt-2 font-display text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
        When does money usually come in?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A day of the month, used to pace spending and forecast the rest of it.
      </p>

      <div className="mt-8 flex items-baseline gap-2 border-b-2 border-border pb-2 transition-colors focus-within:border-[var(--accent)]">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
          onKeyDown={(event) => {
            if (event.key === "Enter") onFinish(value);
          }}
          placeholder="25"
          inputMode="numeric"
          autoFocus
          className="tnum w-20 bg-transparent text-xl outline-none placeholder:text-muted-foreground/40"
          style={{ caretColor: accent }}
        />
        <span className="text-sm text-muted-foreground">of each month</span>
      </div>

      {error ? <p className="mt-2 text-[12px] text-destructive">{error}</p> : null}

      <div className="mt-6">
        <AccentButton accent={accent} onClick={() => onFinish(value)} disabled={saving}>
          {saving ? "Setting up" : "Finish"}
        </AccentButton>
      </div>
    </div>
  );
}

function Done({
  accent,
  draft,
  onOpen,
}: {
  accent: string;
  draft: OnboardingDraft;
  onOpen: () => void;
}) {
  const rows = [
    { label: "Name", value: draft.name ?? "" },
    { label: "Currency", value: draft.currency ?? "UGX" },
    { label: "Account", value: draft.accountName ?? "" },
    {
      label: "Monthly budget",
      value: draft.budget ? `${draft.currency ?? "UGX"} ${draft.budget}` : "Not set",
    },
    { label: "Payday", value: draft.payday ? `Day ${draft.payday}` : "Not set" },
  ];

  return (
    <div className="max-w-[460px]">
      <span
        className="grid size-11 place-items-center rounded-full text-black"
        style={{ background: accent }}
      >
        <Icon icon={Tick02Icon} className="size-5" />
      </span>
      <h1 className="mt-6 font-display text-3xl leading-tight tracking-[-0.04em]">
        You&apos;re set.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Your workspace is ready. Everything here can be changed in settings.
      </p>

      <dl className="mt-7 divide-y divide-border rounded-2xl border border-border px-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7">
        <AccentButton accent={accent} onClick={onOpen}>
          Open dashboard
        </AccentButton>
      </div>
    </div>
  );
}

function AccentButton({
  accent,
  onClick,
  disabled,
  children,
}: {
  accent: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-black transition-transform hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
      style={{ background: accent }}
    >
      {children}
      <Icon icon={ArrowRight01Icon} className="size-4" />
    </button>
  );
}
