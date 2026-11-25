"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { friendlyError } from "@/lib/friendly-error";
import { gooeyToast } from "goey-toast";
import {
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Delete02Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Target01Icon,
  Target02Icon,
  Tick02Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import { AccountSelect } from "@/components/account-select";
import { CategorySelect } from "@/components/category-select";
import { useCategories } from "@/components/categories-provider";
import { useCurrency } from "@/components/currency-provider";
import { DropdownSelect } from "@/components/dropdown-select";
import { MetricCard } from "@/components/metric-card";
import { PlanSectionCharts } from "@/components/plan-section-charts";
import { Checkbox } from "@/components/motion/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/motion/combobox";
import { Input } from "@/components/motion/input";
import { PageReveal, PlanPageSkeleton } from "@/components/skeletons";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { ModalConfirm, ModalForm } from "@/components/modal-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import {
  EmptyState,
  Panel,
  SectionPanel,
  sectionBodyClass,
  sectionCardClass,
} from "@/components/panel";
import { useTransactionDialog } from "@/components/expense-dialog";
import { useApi, api } from "@/lib/use-api";
import {
  addDays,
  formatNumber,
  formatNumericInput,
  monthLabel,
  parseNumericInput,
  parseYmd,
  relativeDay,
  ymd,
} from "@/lib/format";
import { PERIOD_LABELS, PERIOD_OPTIONS } from "@/lib/periods";
import { CURRENCY_META } from "@/lib/currencies";
import { useNow } from "@/lib/use-now";
import type {
  Account,
  Budget,
  BudgetProgress,
  Debt,
  Goal,
  NetWorth,
  PlanActivity,
  RecurringRule,
  Settings,
  StatPeriod,
  TransactionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ModalKind = "goal" | "debt" | "budget" | "recurring";
type ModalState =
  | { kind: "goal"; item: Goal | null }
  | { kind: "debt"; item: Debt | null }
  | { kind: "budget"; item: BudgetProgress | null }
  | { kind: "recurring"; item: RecurringRule | null }
  | null;

type CurrencyDisplay = ReturnType<typeof useCurrency>;

function moneyInputValue(display: CurrencyDisplay, amount: number): string {
  const decimals = CURRENCY_META[display.currency].decimals;
  return formatNumericInput(
    decimals > 0 ? amount.toFixed(decimals) : String(Math.round(amount)),
    decimals > 0,
  );
}

function moneyInputAmount(value: string): number {
  return Math.round(parseNumericInput(value));
}

function moneyInputDecimals(display: CurrencyDisplay): boolean {
  return CURRENCY_META[display.currency].decimals > 0;
}

type PlanSection =
  | "goals"
  | "debts"
  | "recurring"
  | "budgets"
  | "activity";

const PLAN_SECTION_ORDER: PlanSection[] = [
  "goals",
  "debts",
  "recurring",
  "budgets",
  "activity",
];

function isPlanSection(value: string | null): value is PlanSection {
  return (
    value === "goals" ||
    value === "debts" ||
    value === "recurring" ||
    value === "budgets" ||
    value === "activity"
  );
}

type ActionState =
  | {
      kind: "contribution";
      goal: Goal;
      mode: "contribute" | "withdraw";
    }
  | { kind: "payment"; debt: Debt }
  | null;

const FREQUENCIES: RecurringRule["frequency"][] = ["daily", "weekly", "monthly"];
const TYPES: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

function dateLabel(value: string): string {
  return parseYmd(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthsUntil(deadline: string): number {
  const date = parseYmd(deadline);
  const now = new Date();
  return Math.max(
    1,
    (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth(),
  );
}

function shortDateLabel(value: string) {
  return parseYmd(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function shiftMonthKey(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return "";
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12 + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function contributionSpark(
  goals: Goal[],
  activity: PlanActivity[],
) {
  const entries = activity
    .filter((entry) => entry.kind === "goal-contribution")
    .sort((a, b) => a.date.localeCompare(b.date));
  const current = goals.reduce((total, goal) => total + goal.savedUgx, 0);
  if (entries.length === 0) {
    return [
      { label: "Start", value: current },
      { label: "Now", value: current },
    ];
  }

  const contributed = entries.reduce(
    (total, entry) => total + entry.amountUgx,
    0,
  );
  let running = Math.max(0, current - contributed);
  const points = entries.map((entry) => {
    running += entry.amountUgx;
    return { label: shortDateLabel(entry.date), value: running };
  });
  return [...points, { label: "Now", value: current }];
}

function balanceSpark(
  direction: Debt["direction"],
  debts: Debt[],
  activity: PlanActivity[],
) {
  const debtIds = new Set(
    debts
      .filter((debt) => debt.direction === direction)
      .map((debt) => debt.id),
  );
  const current = debts
    .filter((debt) => debtIds.has(debt.id))
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const entries = activity
    .filter(
      (entry) =>
        entry.kind === "debt-payment" && debtIds.has(entry.refId),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (entries.length === 0) {
    return [
      { label: "Start", value: current },
      { label: "Now", value: current },
    ];
  }

  let running =
    current + entries.reduce((total, entry) => total + entry.amountUgx, 0);
  const points = entries.map((entry) => {
    running = Math.max(0, running - entry.amountUgx);
    return { label: shortDateLabel(entry.date), value: running };
  });
  return [...points, { label: "Now", value: current }];
}

export default function PlanPage() {
  const { version, bumpVersion } = useTransactionDialog();
  const display = useCurrency();
  const now = useNow();
  const currentMonth = now ? ymd(now).slice(0, 7) : "";
  const [budgetMonth, setBudgetMonth] = useState<string | null>(null);
  const activeBudgetMonth = budgetMonth ?? currentMonth;
  const goalsApi = useApi<Goal[]>(`/api/goals?v=${version}`);
  const debtsApi = useApi<Debt[]>(`/api/debts?v=${version}`);
  const budgetsApi = useApi<BudgetProgress[]>(
    activeBudgetMonth
      ? `/api/budgets?month=${activeBudgetMonth}&v=${version}`
      : null,
  );
  const recurringApi = useApi<RecurringRule[]>(`/api/recurring?v=${version}`);
  const netWorthApi = useApi<NetWorth>(`/api/networth?v=${version}`);
  const accountsApi = useApi<Account[]>(`/api/accounts?v=${version}`);
  const settingsApi = useApi<Settings>(`/api/settings?v=${version}`);
  const [period, setPeriod] = useState<StatPeriod>("30d");
  const activityApi = useApi<PlanActivity[]>(
    `/api/plan/activity?period=${period}&v=${version}`,
  );
  const activityAllApi = useApi<PlanActivity[]>(
    `/api/plan/activity?period=all&v=${version}`,
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [actionModal, setActionModal] = useState<ActionState>(null);
  const [runningDue, setRunningDue] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<PlanSection>("goals");
  const [sectionDirection, setSectionDirection] = useState(1);
  const [debtFilter, setDebtFilter] = useState<
    "all" | Debt["direction"]
  >("all");
  const [activityFilter, setActivityFilter] = useState<
    "all" | "goals" | "debts" | "recurring"
  >("all");
  const [activityPage, setActivityPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: ModalKind;
    id: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get(
      "section",
    );
    if (!isPlanSection(section)) return;
    const frame = window.requestAnimationFrame(() =>
      setActiveSection(section),
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const goals = useMemo(() => goalsApi.data ?? [], [goalsApi.data]);
  const debts = useMemo(() => debtsApi.data ?? [], [debtsApi.data]);
  const budgets = budgetsApi.data ?? [];
  const recurring = recurringApi.data ?? [];
  const accounts = accountsApi.data ?? [];
  const planDefaultAccountId =
    settingsApi.data?.defaultAccountId ?? accounts[0]?.id ?? "";
  const activity = useMemo(
    () => activityApi.data ?? [],
    [activityApi.data],
  );
  const activityAll = useMemo(
    () => activityAllApi.data ?? [],
    [activityAllApi.data],
  );
  const sparkActivity = activity.length > 1 ? activity : activityAll;
  const netWorth = netWorthApi.data;
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const borrowed = debts
    .filter((debt) => debt.direction === "borrowed")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const lent = debts
    .filter((debt) => debt.direction === "lent")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const goalsSaved = goals.reduce(
    (total, goal) => total + goal.savedUgx,
    0,
  );
  const netWorthSpark = useMemo(
    () =>
      (netWorth?.history ?? []).map((point) => ({
        label: shortDateLabel(point.date),
        value: point.value,
      })),
    [netWorth],
  );
  const borrowedSpark = useMemo(
    () => balanceSpark("borrowed", debts, sparkActivity),
    [debts, sparkActivity],
  );
  const lentSpark = useMemo(
    () => balanceSpark("lent", debts, sparkActivity),
    [debts, sparkActivity],
  );
  const goalsSpark = useMemo(
    () => contributionSpark(goals, sparkActivity),
    [goals, sparkActivity],
  );

  const activitySummary = useMemo(() => {
    const sum = (entries: PlanActivity[]) =>
      entries.reduce((total, entry) => total + entry.amountUgx, 0);
    const goalEntries = activity.filter(
      (entry) => entry.kind === "goal-contribution",
    );
    const debtEntries = activity.filter(
      (entry) => entry.kind === "debt-payment",
    );
    const recurringEntries = activity.filter(
      (entry) => entry.kind === "recurring-run",
    );
    return {
      goals: { count: goalEntries.length, total: sum(goalEntries) },
      debts: { count: debtEntries.length, total: sum(debtEntries) },
      recurring: {
        count: recurringEntries.length,
        total: sum(recurringEntries),
      },
    };
  }, [activity]);

  const filteredActivity = useMemo(
    () =>
      activity.filter((entry) => {
        if (activityFilter === "all") return true;
        if (activityFilter === "goals") {
          return entry.kind === "goal-contribution";
        }
        if (activityFilter === "debts") return entry.kind === "debt-payment";
        return entry.kind === "recurring-run";
      }),
    [activity, activityFilter],
  );

  const ACTIVITY_PAGE_SIZE = 8;
  const activityPageCount = Math.max(
    1,
    Math.ceil(filteredActivity.length / ACTIVITY_PAGE_SIZE),
  );
  const safeActivityPage = Math.min(activityPage, activityPageCount);
  const pagedActivity = filteredActivity.slice(
    (safeActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    safeActivityPage * ACTIVITY_PAGE_SIZE,
  );

  const groupedActivity = useMemo(() => {
    const groups = new Map<string, PlanActivity[]>();
    for (const entry of pagedActivity) {
      const list = groups.get(entry.date) ?? [];
      list.push(entry);
      groups.set(entry.date, list);
    }
    return Array.from(groups.entries());
  }, [pagedActivity]);

  const ready =
    goalsApi.data && debtsApi.data && budgetsApi.data && recurringApi.data;

  if (!ready) {
    return <PlanPageSkeleton />;
  }

  function refreshAll() {
    goalsApi.refresh();
    debtsApi.refresh();
    budgetsApi.refresh();
    recurringApi.refresh();
    netWorthApi.refresh();
    accountsApi.refresh();
    activityApi.refresh();
    activityAllApi.refresh();
  }

  function saved() {
    setModal(null);
    refreshAll();
    bumpVersion();
  }

  function actionSaved() {
    setActionModal(null);
    refreshAll();
    bumpVersion();
  }

  function selectSection(section: PlanSection) {
    const currentIndex = PLAN_SECTION_ORDER.indexOf(activeSection);
    const nextIndex = PLAN_SECTION_ORDER.indexOf(section);
    setSectionDirection(nextIndex >= currentIndex ? 1 : -1);
    setActiveSection(section);
    const url = new URL(window.location.href);
    url.searchParams.set("section", section);
    window.history.replaceState(null, "", url);
  }

  async function remove(kind: ModalKind, id: string) {
    const key = `${kind}:${id}`;
    if (removingKey) return;
    setRemovingKey(key);
    try {
      const path = kind === "recurring" ? "recurring" : `${kind}s`;
      await api.delete(`/api/${path}/${id}`);
      const label =
        kind === "goal"
          ? "Savings pot"
          : kind === "debt"
            ? "Debt"
            : kind === "budget"
              ? "Budget"
              : "Recurring rule";
      gooeyToast.success(`${label} deleted`, {
        description: "Your plan has been updated.",
      });
      refreshAll();
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not delete item", {
        description: friendlyError(error),
      });
    } finally {
      setRemovingKey(null);
    }
  }

  async function toggleRule(rule: RecurringRule, enabled: boolean) {
    await api.patch(`/api/recurring/${rule.id}`, { enabled });
    refreshAll();
    bumpVersion();
  }

  async function runDue() {
    if (runningDue) return;
    setRunningDue(true);
    try {
      const result = await api.post<{ created: number }>(
        "/api/recurring/run",
        {},
      );
      gooeyToast.success(
        result.created
          ? `${result.created} recurring transaction${result.created === 1 ? "" : "s"} added`
          : "No recurring transactions due",
        {
          description: result.created
            ? "Scheduled items were posted to your ledger."
            : "Everything scheduled for today is already up to date.",
        },
      );
      refreshAll();
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not run recurring items", {
        description: friendlyError(error),
      });
    } finally {
      setRunningDue(false);
    }
  }

  async function skipNext(rule: RecurringRule) {
    if (skippingId) return;
    setSkippingId(rule.id);
    try {
      await api.post(`/api/recurring/${rule.id}/skip`, {});
      gooeyToast.success("Next occurrence skipped", {
        description: `${rule.name} moved forward one ${rule.frequency} cycle.`,
      });
      refreshAll();
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not skip occurrence", {
        description: friendlyError(error),
      });
    } finally {
      setSkippingId(null);
    }
  }

  const today = ymd(new Date());
  const dueNow = recurring.filter(
    (rule) => rule.enabled && rule.nextOn <= today,
  ).length;
  const upcoming30 = recurring.filter(
    (rule) =>
      rule.enabled &&
      rule.nextOn > today &&
      rule.nextOn <= ymd(addDays(new Date(), 30)),
  ).length;
  const monthlyLoad = recurring
    .filter((rule) => rule.enabled)
    .reduce((total, rule) => {
      const multiplier =
        rule.frequency === "daily" ? 30 : rule.frequency === "weekly" ? 4 : 1;
      return total + rule.amountUgx * multiplier;
    }, 0);
  const budgetLabel = activeBudgetMonth
    ? monthLabel(activeBudgetMonth)
    : "This month";
  const canGoNewerBudget = Boolean(
    activeBudgetMonth && currentMonth && activeBudgetMonth < currentMonth,
  );
  const sectionNav = [
    { id: "goals" as const, label: "Savings", count: goals.length },
    { id: "debts" as const, label: "Debts", count: debts.length },
    {
      id: "recurring" as const,
      label: "Recurring",
      count: recurring.length,
    },
    { id: "budgets" as const, label: "Budgets", count: budgets.length },
    {
      id: "activity" as const,
      label: "Activity",
      count: activity.length,
    },
  ];
  const showsSection = (section: PlanSection) =>
    activeSection === section;
  const visibleDebts = debts.filter(
    (debt) => debtFilter === "all" || debt.direction === debtFilter,
  );

  function moveBudgetMonth(delta: number) {
    if (!activeBudgetMonth) return;
    const next = shiftMonthKey(activeBudgetMonth, delta);
    if (!next || (currentMonth && next > currentMonth)) return;
    setBudgetMonth(next);
  }

  return (
    <PageReveal className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl leading-none tracking-[-0.03em] md:text-3xl">
            Give the money a job.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Goals, debts, recurring bills and budgets in one place.
          </p>
        </div>
        <Combobox
          value={period}
          onValueChange={(value) => {
            setActivityPage(1);
            setPeriod(value as StatPeriod);
          }}
          className="w-36 shrink-0"
        >
          <ComboboxTrigger className="h-9 min-w-0 rounded-full px-2.5">
            <ComboboxInput
              aria-label="Plan activity range"
              placeholder="Activity range"
              className="h-9 text-[13px]"
              showIcon={false}
            />
          </ComboboxTrigger>
          <ComboboxContent className="w-52 rounded-2xl">
            <ComboboxList ariaLabel="Plan activity range" className="p-2">
              <ComboboxEmpty>No ranges.</ComboboxEmpty>
              {PERIOD_OPTIONS.map((option) => (
                <ComboboxItem
                  key={option.value}
                  value={option.value}
                  textValue={option.label}
                >
                  {option.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          compact
          label="Net worth"
          info="Assets minus liabilities across your accounts and debts."
          value={netWorth?.total ?? 0}
          foot={PERIOD_LABELS[period]}
          spark={netWorthSpark}
          sparkKey="value"
          sparkLabelKey={(point) => point.label}
          sparkColor="oklch(0.62 0.19 259)"
          icon={Wallet02Icon}
          tone="sky"
        />
        <MetricCard
          compact
          label="You owe"
          info="Total borrowed balances you still owe."
          value={borrowed}
          foot={PERIOD_LABELS[period]}
          spark={borrowedSpark}
          sparkKey="value"
          sparkLabelKey={(point) => point.label}
          sparkColor="oklch(0.645 0.246 16)"
          icon={ArrowUp02Icon}
          tone="rose"
        />
        <MetricCard
          compact
          label="Owed to you"
          info="Total money lent to others that is still outstanding."
          value={lent}
          foot={PERIOD_LABELS[period]}
          spark={lentSpark}
          sparkKey="value"
          sparkLabelKey={(point) => point.label}
          sparkColor="oklch(0.696 0.17 162)"
          icon={ArrowDown02Icon}
          tone="emerald"
        />
        <MetricCard
          compact
          label="Savings saved"
          info="Total saved across all savings pots."
          value={goalsSaved}
          foot={PERIOD_LABELS[period]}
          spark={goalsSpark}
          sparkKey="value"
          sparkLabelKey={(point) => point.label}
          sparkColor="oklch(0.606 0.25 292)"
          icon={Target01Icon}
          tone="violet"
        />
      </div>

      <nav
        aria-label="Plan sections"
        className="sticky top-16 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full border border-white/10 bg-zinc-900/95 p-1 text-white shadow-2xl backdrop-blur-xl"
      >
        {sectionNav.map((section) => {
          const active = activeSection === section.id;
          const count = "count" in section ? section.count : null;
          return (
            <button
              key={section.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectSection(section.id)}
              className={cn(
                "relative inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors",
                active
                  ? "text-white"
                  : "text-white/55 hover:bg-white/[0.08] hover:text-white",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="plan-section-active"
                  className="absolute inset-0 rounded-full bg-white/[0.16]"
                  transition={SPRING_LAYOUT}
                />
              ) : null}
              <span className="relative z-10 inline-flex items-center">
                {section.label}
                {count !== null ? (
                  <span className="ml-1.5 text-[10px] text-white/40">
                    {count}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait" initial={false} custom={sectionDirection}>
        <motion.div
          key={activeSection}
          custom={sectionDirection}
          variants={{
            enter: (direction: number) => ({
              opacity: 0,
              y: direction > 0 ? 16 : -16,
              filter: "blur(6px)",
            }),
            center: { opacity: 1, y: 0, filter: "blur(0px)" },
            exit: (direction: number) => ({
              opacity: 0,
              y: direction > 0 ? -10 : 10,
              filter: "blur(4px)",
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="space-y-8"
        >
      {activeSection === "goals" ||
      activeSection === "debts" ||
      activeSection === "activity" ? (
        <Panel className={sectionCardClass}>
          <div className={cn(sectionBodyClass, "p-6 sm:p-8")}>
            <PlanSectionCharts
              section={activeSection}
              goals={goals}
              debts={debts}
              activity={activity}
              allActivity={activityAll}
            />
          </div>
        </Panel>
      ) : null}
      <SectionPanel
        title="Savings pots"
        info="Targets, funding accounts, deposits and deadlines."
        className={showsSection("goals") ? undefined : "hidden"}
        hint={`${display.formatMoney(goalsSaved)} saved across ${formatNumber(goals.length)} pots`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModal({ kind: "goal", item: null })}
          >
            <Icon icon={PlusSignIcon} className="size-3.5" /> Add pot
          </Button>
        }
        bodyClassName="p-5"
      >
        {goals.length === 0 ? (
          <EmptyState
            title="No savings yet"
            hint="Add a target, a funding account, and start saving."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
              const pct = Math.min(
                100,
                Math.round(
                  (goal.savedUgx / Math.max(1, goal.targetUgx)) * 100,
                ),
              );
              const remaining = Math.max(
                0,
                goal.targetUgx - goal.savedUgx,
              );
              const months = monthsUntil(goal.deadline);
              const last = activity.find(
                (entry) =>
                  entry.kind === "goal-contribution" &&
                  entry.refId === goal.id,
              );
              const overdue =
                goal.deadline < today && goal.savedUgx < goal.targetUgx;
              return (
                <div
                  key={goal.id}
                  className="rounded-xl border border-foreground/10 bg-muted/45 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center"
                    >
                      <Icon icon={Target02Icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {goal.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {dateLabel(goal.deadline)}
                        {overdue ? " · overdue" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({ kind: "goal", item: goal })
                      }
                      aria-label={`Edit ${goal.name}`}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Icon
                        icon={PencilEdit01Icon}
                        className="size-3.5"
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "goal",
                          id: goal.id,
                          label: `Delete ${goal.name}?`,
                        })
                      }
                      loading={removingKey === `goal:${goal.id}`}
                      aria-label={`Delete ${goal.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon icon={Delete02Icon} className="size-3.5" />
                    </Button>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <Money value={goal.savedUgx} size="md" />
                    <span className="text-[11px] text-muted-foreground">
                      of {display.formatMoney(goal.targetUgx)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: goal.color,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{pct}% funded</span>
                    <span>
                      {remaining > 0
                        ? `${display.formatMoney(Math.round(remaining / months))} / month`
                        : "Target reached"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                      {last
                        ? `Last · ${shortDateLabel(last.date)} · ${display.formatMoney(last.amountUgx)}`
                        : "No contributions yet"}
                    </p>
                    {goal.savedUgx < goal.targetUgx ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActionModal({
                            kind: "contribution",
                            goal,
                            mode: "contribute",
                          })
                        }
                      >
                        <Icon icon={PlusSignIcon} className="size-3.5" />
                        Contribute
                      </Button>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        Funded
                      </span>
                    )}
                    {goal.savedUgx > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Take money out of this savings pot and lower its saved balance"
                        onClick={() =>
                          setActionModal({
                            kind: "contribution",
                            goal,
                            mode: "withdraw",
                          })
                        }
                      >
                        Withdraw savings
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      <SectionPanel
        title="Debts"
        info="Borrowed and lent balances, payments and due dates."
        className={showsSection("debts") ? undefined : "hidden"}
        hint={`${display.formatMoney(borrowed)} owed · ${display.formatMoney(lent)} lent`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModal({ kind: "debt", item: null })}
          >
            <Icon icon={PlusSignIcon} className="size-3.5" /> Add debt
          </Button>
        }
        bodyClassName="p-3"
      >
        <div className="mb-3 flex w-fit items-center gap-1 rounded-full border border-foreground/10 bg-card/50 p-1">
          {(
            [
              { id: "all" as const, label: "All" },
              { id: "borrowed" as const, label: "Borrowed" },
              { id: "lent" as const, label: "Lent" },
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={debtFilter === option.id}
              onClick={() => setDebtFilter(option.id)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium transition-colors",
                debtFilter === option.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/15 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {visibleDebts.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No {debtFilter === "all" ? "" : `${debtFilter} `}debts match
            this filter.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/5">
            {visibleDebts.map((debt) => {
              const paid = Math.max(
                0,
                debt.principalUgx - debt.balanceUgx,
              );
              const paidPct = Math.min(
                100,
                Math.round(
                  (paid / Math.max(1, debt.principalUgx)) * 100,
                ),
              );
              const settled = debt.balanceUgx <= 0;
              const last = activity.find(
                (entry) =>
                  entry.kind === "debt-payment" &&
                  entry.refId === debt.id,
              );
              return (
                <li key={debt.id} className="px-2 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        debt.direction === "borrowed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {debt.direction === "borrowed" ? "Borrowed" : "Lent"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]">
                        {debt.counterparty}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        Due {dateLabel(debt.dueOn)}
                        {debt.note ? ` · ${debt.note}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <Money value={debt.balanceUgx} size="sm" />
                      <p className="text-[10px] text-muted-foreground">
                        {settled ? "Settled" : `${paidPct}% paid`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/50"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                    <p className="min-w-0 max-w-[45%] truncate text-[10px] text-muted-foreground">
                      {last
                        ? `Last · ${shortDateLabel(last.date)} · ${display.formatMoney(last.amountUgx)}`
                        : "No payments yet"}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {!settled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActionModal({
                            kind: "payment",
                            debt,
                          })
                        }
                      >
                        <Icon
                          icon={Tick02Icon}
                          className="size-3.5"
                        />
                        Log payment
                      </Button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setModal({ kind: "debt", item: debt })
                      }
                      aria-label={`Edit debt with ${debt.counterparty}`}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Icon
                        icon={PencilEdit01Icon}
                        className="size-3.5"
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "debt",
                          id: debt.id,
                          label: `Delete debt with ${debt.counterparty}?`,
                        })
                      }
                      loading={removingKey === `debt:${debt.id}`}
                      aria-label={`Delete debt with ${debt.counterparty}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon icon={Delete02Icon} className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionPanel>

      <SectionPanel
        title="Recurring"
        info="Bills and income that repeat, with due dates and run history."
        className={showsSection("recurring") ? undefined : "hidden"}
        hint={`${dueNow} due · ${upcoming30} in the next 30 days · ${display.formatMoney(monthlyLoad)} monthly load`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={runDue}
              loading={runningDue}
            >
              Run due
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setModal({ kind: "recurring", item: null })
              }
            >
              <Icon icon={PlusSignIcon} className="size-3.5" /> Add rule
            </Button>
          </div>
        }
        bodyClassName="p-3"
      >
        {recurring.length === 0 ? (
          <EmptyState
            title="Nothing recurring yet"
            hint="Add salary, rent or subscriptions."
          />
        ) : (
          <ul className="divide-y divide-foreground/5">
            {recurring.map((rule) => {
              const account = accountById.get(rule.accountId);
              const destination = rule.toAccountId
                ? accountById.get(rule.toAccountId)
                : null;
              const due = rule.enabled && rule.nextOn <= today;
              return (
                <li
                  key={rule.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 px-2 py-3",
                    !rule.enabled && "opacity-55",
                  )}
                >
                  <Checkbox
                    checked={rule.enabled}
                    onCheckedChange={(enabled) =>
                      toggleRule(rule, enabled)
                    }
                    aria-label={`Enable ${rule.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{rule.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {rule.frequency} · next {dateLabel(rule.nextOn)}
                      {account ? ` · ${account.name}` : ""}
                      {destination ? ` → ${destination.name}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      due
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {due ? "Due now" : "Scheduled"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      rule.type === "income"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : rule.type === "transfer"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {rule.type}
                  </span>
                  <Money value={rule.amountUgx} size="sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skipNext(rule)}
                    loading={skippingId === rule.id}
                  >
                    Skip
                  </Button>
                  <button
                    type="button"
                    onClick={() =>
                      setModal({ kind: "recurring", item: rule })
                    }
                    aria-label={`Edit ${rule.name}`}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Icon
                      icon={PencilEdit01Icon}
                      className="size-3.5"
                    />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "recurring",
                        id: rule.id,
                        label: `Delete ${rule.name}?`,
                      })
                    }
                    loading={removingKey === `recurring:${rule.id}`}
                    aria-label={`Delete ${rule.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Icon icon={Delete02Icon} className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionPanel>

      <SectionPanel
        title="Budgets"
        info="Category and overall spending limits with month navigation."
        className={showsSection("budgets") ? undefined : "hidden"}
        hint={`${budgetLabel} · monthly and weekly limits`}
        action={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => moveBudgetMonth(-1)}
              aria-label="View older budget month"
            >
              <Icon icon={ArrowLeft01Icon} className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => moveBudgetMonth(1)}
              disabled={!canGoNewerBudget}
              aria-label="View newer budget month"
            >
              <Icon icon={ArrowRight01Icon} className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModal({ kind: "budget", item: null })}
            >
              <Icon icon={PlusSignIcon} className="size-3.5" /> Add budget
            </Button>
          </div>
        }
        bodyClassName="p-3"
      >
        {budgets.length === 0 ? (
          <EmptyState
            title="No budgets yet"
            hint="Set a limit and watch it move."
          />
        ) : (
          <ul className="divide-y divide-foreground/5">
            {budgets.map((budget) => {
              const pct = Math.min(
                100,
                Math.round(
                  (budget.spentUgx / Math.max(1, budget.limitUgx)) *
                    100,
                ),
              );
              const over = budget.spentUgx > budget.limitUgx;
              return (
                <li key={budget.id} className="px-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: budget.color }}
                      />
                      {budget.name}
                      <span className="text-[10px] text-muted-foreground">
                        {budget.categoryId === "all"
                          ? "overall"
                          : budget.categoryId}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "tnum",
                          over
                            ? "text-destructive"
                            : "text-foreground",
                        )}
                      >
                        {display.formatValue(budget.spentUgx)} /{" "}
                        {display.formatMoney(budget.limitUgx)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setModal({ kind: "budget", item: budget })
                        }
                        aria-label={`Edit ${budget.name}`}
                        className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Icon
                          icon={PencilEdit01Icon}
                          className="size-3.5"
                        />
                      </button>
                      {budget.categoryId !== "all" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "budget",
                              id: budget.id,
                              label: `Delete ${budget.name}?`,
                            })
                          }
                          loading={removingKey === `budget:${budget.id}`}
                          aria-label={`Delete ${budget.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Icon
                            icon={Delete02Icon}
                            className="size-3.5"
                          />
                        </Button>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: over
                          ? "var(--destructive)"
                          : budget.color,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{pct}% used</span>
                    <span>
                      {over
                        ? `${display.formatMoney(budget.spentUgx - budget.limitUgx)} over`
                        : `${display.formatMoney(budget.limitUgx - budget.spentUgx)} left`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionPanel>

      <SectionPanel
        title="Plan activity"
        info="Contributions, debt payments and recurring runs in the selected range. This history is separate from day-to-day expenses."
        className={showsSection("activity") ? undefined : "hidden"}
        hint={`${PERIOD_LABELS[period]} · ${formatNumber(activity.length)} entries`}
        bodyClassName="p-3"
      >
        <div className="grid gap-4 px-2 pb-4 sm:grid-cols-3">
          <MetricCard
            compact
            label="Savings activity"
            info="Net change in savings balances in the selected range."
            value={activitySummary.goals.total}
            foot={`${formatNumber(activitySummary.goals.count)} ${
              activitySummary.goals.count === 1 ? "change" : "changes"
            }`}
            icon={Target01Icon}
            tone="violet"
          />
          <MetricCard
            compact
            label="Debt payments"
            info="Debt payments recorded in the selected range."
            value={activitySummary.debts.total}
            foot={`${formatNumber(activitySummary.debts.count)} ${
              activitySummary.debts.count === 1 ? "payment" : "payments"
            }`}
            icon={Tick02Icon}
            tone="sky"
          />
          <MetricCard
            compact
            label="Recurring runs"
            info="Recurring bills and income applied in the selected range."
            value={activitySummary.recurring.total}
            foot={`${formatNumber(activitySummary.recurring.count)} ${
              activitySummary.recurring.count === 1 ? "run" : "runs"
            }`}
            icon={Wallet02Icon}
            tone="emerald"
          />
        </div>

        <div className="flex items-center gap-3 px-2 pb-3">
          <p className="text-[11px] text-muted-foreground">Newest first</p>
          <DropdownSelect
            value={activityFilter}
            onValueChange={(value) => {
              setActivityPage(1);
              setActivityFilter(
                value as "all" | "goals" | "debts" | "recurring",
              );
            }}
            ariaLabel="Activity type"
            options={[
              { value: "all", label: "All activity" },
              { value: "goals", label: "Savings" },
              { value: "debts", label: "Debts" },
              { value: "recurring", label: "Recurring" },
            ]}
            className="w-40"
          />
        </div>

        {filteredActivity.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No {activityFilter === "all" ? "" : activityFilter === "goals" ? "savings " : `${activityFilter} `}activity
            in this range yet.
          </p>
        ) : (
          <div className="space-y-4">
            {groupedActivity.map(([date, entries]) => (
              <div key={date}>
                <div className="flex items-center gap-3 px-2 pb-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {relativeDay(date, today)}
                  </p>
                  <span className="h-px flex-1 bg-foreground/10" />
                </div>
                <ul className="divide-y divide-foreground/5">
                  {entries.map((entry) => {
                    const withdrawal =
                      entry.kind === "goal-contribution" &&
                      entry.amountUgx < 0;
                    const label =
                      entry.kind === "goal-contribution"
                        ? withdrawal
                          ? "Savings withdrawal"
                          : "Savings deposit"
                        : entry.kind === "debt-payment"
                          ? "Debt payment"
                          : "Recurring run";
                    return (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 px-2 py-3"
                      >
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-lg",
                            entry.kind === "goal-contribution"
                              ? withdrawal
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                              : entry.kind === "debt-payment"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          <Icon
                            icon={
                              entry.kind === "goal-contribution"
                                ? withdrawal
                                  ? ArrowUp02Icon
                                  : Target01Icon
                                : entry.kind === "debt-payment"
                                  ? Tick02Icon
                                  : Wallet02Icon
                            }
                            className="size-3.5"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px]">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {entry.title}
                            </span>
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {entry.detail}
                            {entry.accountName
                              ? ` · ${entry.accountName}`
                              : ""}
                          </p>
                        </div>
                        <Money value={entry.amountUgx} size="sm" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1">
              <p className="text-[11px] text-muted-foreground">
                Showing{" "}
                {filteredActivity.length === 0
                  ? 0
                  : (safeActivityPage - 1) * ACTIVITY_PAGE_SIZE + 1}
                –{Math.min(safeActivityPage * ACTIVITY_PAGE_SIZE, filteredActivity.length)}{" "}
                of {formatNumber(filteredActivity.length)}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setActivityPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeActivityPage === 1}
                  aria-label="Previous activity page"
                >
                  <Icon icon={ArrowLeft01Icon} className="size-4" />
                </Button>
                <span className="px-1 text-[11px] text-muted-foreground">
                  Page {safeActivityPage} of {activityPageCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setActivityPage((page) =>
                      Math.min(activityPageCount, page + 1),
                    )
                  }
                  disabled={safeActivityPage === activityPageCount}
                  aria-label="Next activity page"
                >
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </SectionPanel>
        </motion.div>
      </AnimatePresence>

      <MorphingModal
        viewId={modal?.kind ?? null}
        onClose={() => setModal(null)}
        placement="center"
        className="max-w-lg"
        contentClassName="p-1"
        ariaLabel={modal ? `Edit ${modal.kind}` : "Plan item"}
      >
        {modal?.kind === "goal" ? (
          <GoalForm
            key={modal.item?.id ?? "new-goal"}
            goal={modal.item}
            accounts={accounts}
            defaultAccountId={planDefaultAccountId}
            onSaved={saved}
            onCancel={() => setModal(null)}
          />
        ) : null}
        {modal?.kind === "debt" ? (
          <DebtForm
            key={modal.item?.id ?? "new-debt"}
            debt={modal.item}
            onSaved={saved}
            onCancel={() => setModal(null)}
          />
        ) : null}
        {modal?.kind === "budget" ? (
          <BudgetForm
            key={modal.item?.id ?? "new-budget"}
            budget={modal.item}
            onSaved={saved}
            onCancel={() => setModal(null)}
          />
        ) : null}
        {modal?.kind === "recurring" ? (
          <RecurringForm
            key={modal.item?.id ?? "new-recurring"}
            rule={modal.item}
            accounts={accounts}
            defaultAccountId={planDefaultAccountId}
            onSaved={saved}
            onCancel={() => setModal(null)}
          />
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={actionModal ? "plan-action" : null}
        onClose={() => setActionModal(null)}
        placement="center"
        className="max-w-md"
        contentClassName="p-1"
        ariaLabel={
          actionModal?.kind === "payment"
            ? "Log debt payment"
            : "Add savings deposit"
        }
      >
        {actionModal?.kind === "contribution" ? (
          <ContributionForm
            key={`${actionModal.goal.id}-${actionModal.mode}`}
            goal={actionModal.goal}
            mode={actionModal.mode}
            accounts={accounts}
            defaultAccountId={planDefaultAccountId}
            onSaved={actionSaved}
            onCancel={() => setActionModal(null)}
          />
        ) : null}
        {actionModal?.kind === "payment" ? (
          <PaymentForm
            key={actionModal.debt.id}
            debt={actionModal.debt}
            accounts={accounts}
            defaultAccountId={planDefaultAccountId}
            onSaved={actionSaved}
            onCancel={() => setActionModal(null)}
          />
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={deleteTarget ? "delete-plan-item" : null}
        onClose={() => {
          if (!removingKey) setDeleteTarget(null);
        }}
        placement="center"
        className="max-w-sm"
        contentClassName="p-1"
        ariaLabel="Confirm delete"
      >
        {deleteTarget ? (
          <ModalConfirm
            title={deleteTarget.label}
            description="This removes the item and its related history."
            loading={Boolean(removingKey)}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={async () => {
              if (!deleteTarget) return;
              await remove(deleteTarget.kind, deleteTarget.id);
              setDeleteTarget(null);
            }}
          />
        ) : null}
      </MorphingModal>
    </PageReveal>
  );
}

function ContributionForm({
  goal,
  mode,
  accounts,
  defaultAccountId,
  onSaved,
  onCancel,
}: {
  goal: Goal;
  mode: "contribute" | "withdraw";
  accounts: Account[];
  defaultAccountId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const display = useCurrency();
  const cashAccount = accounts.find((account) => account.type === "cash");
  const sourceOptions = [
    ...(cashAccount
      ? [{ value: "cash", label: "Cash" }]
      : []),
    ...accounts
      .filter((account) => account.type !== "cash")
      .map((account) => ({ value: account.id, label: account.name })),
  ];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(ymd(new Date()));
  const [source, setSource] = useState(
    goal.accountId ?? (cashAccount ? "cash" : defaultAccountId),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const entered = moneyInputAmount(amount);
    if (!Number.isFinite(entered) || entered <= 0 || saving) return;
    if (mode === "withdraw" && entered > goal.savedUgx) {
      gooeyToast.error("Not enough saved", {
        description: `You can withdraw up to ${display.formatMoney(goal.savedUgx)}.`,
      });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/goals/${goal.id}/contributions`, {
        amountUgx:
          mode === "withdraw"
            ? -Math.round(entered)
            : Math.round(entered),
        date,
        accountId: source === "cash" ? cashAccount?.id : source,
        note,
      });
      gooeyToast.success(
        mode === "withdraw" ? "Withdrawal logged" : "Contribution added",
        {
          description: `${display.formatMoney(entered)} ${
            mode === "withdraw" ? "from" : "toward"
          } ${goal.name}.`,
        },
      );
      onSaved();
    } catch (error) {
      gooeyToast.error(
        mode === "withdraw"
          ? "Could not withdraw"
          : "Could not add contribution",
        {
          description: friendlyError(error),
        },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={
        mode === "withdraw"
          ? `Withdraw from ${goal.name}`
          : `Contribute to ${goal.name}`
      }
      hint={`${display.formatMoney(goal.savedUgx)} of ${display.formatMoney(goal.targetUgx)} saved.`}
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing
      submitLabel={mode === "withdraw" ? "Withdraw" : "Contribute"}
    >
      <Input
        label={`Amount (${display.unit})`}
        value={amount}
        onChange={(value) =>
          setAmount(formatNumericInput(value, moneyInputDecimals(display)))
        }
        placeholder={moneyInputValue(display, 100_000)}
      />
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={setDate}
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">
          {mode === "withdraw" ? "Put back in:" : "Source:"}
        </p>
        <DropdownSelect
          value={source}
          onValueChange={setSource}
          ariaLabel={mode === "withdraw" ? "Withdrawal destination" : "Contribution source"}
          options={sourceOptions}
          className="w-40 min-[360px]:w-52"
        />
      </div>
      <div className="rounded-xl border border-foreground/10 bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
        {mode === "withdraw"
          ? "A withdrawal lowers this savings pot and returns the money to the account you pick. Nothing is counted as income."
          : "A deposit raises this savings pot and moves the money out of the account you pick. Nothing is counted as spending."}
      </div>
      <Input
        label="Note"
        value={note}
        onChange={setNote}
        placeholder={
          mode === "withdraw" ? "Why you withdrew" : "Monthly top-up"
        }
      />
    </FormShell>
  );
}

function PaymentForm({
  debt,
  accounts,
  defaultAccountId,
  onSaved,
  onCancel,
}: {
  debt: Debt;
  accounts: Account[];
  defaultAccountId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const display = useCurrency();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(ymd(new Date()));
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amountUgx = moneyInputAmount(amount);
    if (!Number.isFinite(amountUgx) || amountUgx <= 0 || saving) return;
    setSaving(true);
    try {
      await api.post(`/api/debts/${debt.id}/payments`, {
        amountUgx: Math.round(amountUgx),
        date,
        accountId,
        note,
      });
      gooeyToast.success("Payment logged", {
        description: `${display.formatMoney(amountUgx)} with ${debt.counterparty}.`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not log payment", {
        description: friendlyError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={`Log payment · ${debt.counterparty}`}
      hint={`${display.formatMoney(debt.balanceUgx)} still outstanding.`}
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing
      submitLabel="Log payment"
    >
      <Input
        label={`Amount (${display.unit})`}
        value={amount}
        onChange={(value) =>
          setAmount(formatNumericInput(value, moneyInputDecimals(display)))
        }
        placeholder={moneyInputValue(display, debt.balanceUgx)}
      />
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={setDate}
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">
          {debt.direction === "borrowed" ? "Paid from:" : "Received in:"}
        </p>
        <AccountSelect
          label={
            debt.direction === "borrowed" ? "Paid from" : "Received in"
          }
          value={accountId}
          accounts={accounts}
          onValueChange={setAccountId}
          compact
          hideLabel
          className="w-40 min-[360px]:w-52"
        />
      </div>
      <Input
        label="Note"
        value={note}
        onChange={setNote}
        placeholder="Part payment"
      />
    </FormShell>
  );
}

function FormShell({
  title,
  hint,
  children,
  onCancel,
  onSubmit,
  saving,
  editing,
  submitLabel,
  onDelete,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
  editing: boolean;
  submitLabel?: string;
  onDelete?: () => void;
}) {
  return (
    <ModalForm
      title={title}
      hint={hint}
      onCancel={onCancel}
      onSubmit={onSubmit}
      saving={saving}
      editing={editing}
      submitLabel={submitLabel}
      onDelete={onDelete}
    >
      {children}
    </ModalForm>
  );
}

function GoalForm({
  goal,
  accounts,
  defaultAccountId,
  onSaved,
  onCancel,
}: {
  goal: Goal | null;
  accounts: Account[];
  defaultAccountId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const display = useCurrency();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(
    goal ? moneyInputValue(display, goal.targetUgx) : "",
  );
  const [deadline, setDeadline] = useState(
    goal?.deadline ?? ymd(addDays(new Date(), 90)),
  );
  const [note, setNote] = useState(goal?.note ?? "");
  const [accountId, setAccountId] = useState(
    goal?.accountId ?? defaultAccountId,
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    const targetUgx = moneyInputAmount(target);
    if (!name.trim() || !Number.isFinite(targetUgx) || targetUgx <= 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        targetUgx: Math.round(targetUgx),
        savedUgx: goal?.savedUgx ?? 0,
        deadline,
        note,
        color: goal?.color ?? "oklch(0.7 0.15 155)",
        accountId,
      };
      if (goal) {
        await api.patch(`/api/goals/${goal.id}`, payload);
      } else {
        await api.post("/api/goals", payload);
      }
      gooeyToast.success(goal ? "Savings pot updated" : "Savings pot added", {
        description: `${name.trim()} · ${display.formatMoney(Math.round(targetUgx))} target`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save savings pot", { description: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={goal ? "Edit savings pot" : "Add savings pot"}
      hint="A target, the account it draws from, and a deadline."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(goal)}
    >
      <Input label="Name" value={name} onChange={setName} placeholder="Emergency fund" />
      <Input
        label={`Target (${display.unit})`}
        value={target}
        onChange={(value) =>
          setTarget(formatNumericInput(value, moneyInputDecimals(display)))
        }
        placeholder={moneyInputValue(display, 3_000_000)}
      />
      <AccountSelect
        label="Funding account"
        value={accountId}
        accounts={accounts}
        onValueChange={setAccountId}
      />
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted-foreground">Deadline</span>
        <input
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          className="h-10 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-sm outline-none focus-visible:border-foreground/50 focus-visible:ring-0"
        />
      </label>
      <Input label="Note" value={note} onChange={setNote} placeholder="Why this matters" />
    </FormShell>
  );
}

function DebtForm({
  debt,
  onSaved,
  onCancel,
}: {
  debt: Debt | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const display = useCurrency();
  const [direction, setDirection] = useState<Debt["direction"]>(
    debt?.direction ?? "borrowed",
  );
  const [counterparty, setCounterparty] = useState(debt?.counterparty ?? "");
  const [principal, setPrincipal] = useState(
    debt ? moneyInputValue(display, debt.principalUgx) : "",
  );
  const [dueOn, setDueOn] = useState(debt?.dueOn ?? ymd(addDays(new Date(), 30)));
  const [note, setNote] = useState(debt?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const principalUgx = moneyInputAmount(principal);
    if (!counterparty.trim() || !Number.isFinite(principalUgx) || principalUgx <= 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        direction,
        counterparty: counterparty.trim(),
        principalUgx: Math.round(principalUgx),
        balanceUgx: debt?.balanceUgx ?? Math.round(principalUgx),
        dueOn,
        note,
      };
      if (debt) {
        await api.patch(`/api/debts/${debt.id}`, payload);
      } else {
        await api.post("/api/debts", payload);
      }
      gooeyToast.success(debt ? "Debt updated" : "Debt added", {
        description: `${counterparty.trim()} · ${display.formatMoney(principalUgx)} ${
          direction === "borrowed" ? "borrowed" : "lent"
        }`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save debt", { description: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={debt ? "Edit debt" : "Add debt"}
      hint="Borrowed or lent, with the balance still outstanding."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(debt)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Direction:</p>
        <DropdownSelect
          value={direction}
          onValueChange={(value) =>
            setDirection(value as Debt["direction"])
          }
          ariaLabel="Debt direction"
          className="w-40 min-[360px]:w-52"
          options={[
            { value: "borrowed", label: "I borrowed" },
            { value: "lent", label: "I lent" },
          ]}
        />
      </div>
      <Input
        label="Counterparty"
        value={counterparty}
        onChange={setCounterparty}
        placeholder="Mum, Brian, SACCO"
      />
      <Input
        label={`Principal (${display.unit})`}
        value={principal}
        onChange={(value) =>
          setPrincipal(formatNumericInput(value, moneyInputDecimals(display)))
        }
        placeholder={moneyInputValue(display, 500_000)}
      />
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted-foreground">Due date</span>
        <input
          type="date"
          value={dueOn}
          onChange={(event) => setDueOn(event.target.value)}
          className="h-10 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-sm outline-none focus-visible:border-foreground/50 focus-visible:ring-0"
        />
      </label>
      <Input label="Note" value={note} onChange={setNote} placeholder="What it was for" />
    </FormShell>
  );
}

function BudgetForm({
  budget,
  onSaved,
  onCancel,
}: {
  budget: BudgetProgress | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const display = useCurrency();
  const [name, setName] = useState(budget?.name ?? "");
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "all");
  const [limit, setLimit] = useState(
    budget ? moneyInputValue(display, budget.limitUgx) : "",
  );
  const [period, setPeriod] = useState<Budget["period"]>(budget?.period ?? "monthly");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const limitUgx = moneyInputAmount(limit);
    if (!name.trim() || !Number.isFinite(limitUgx) || limitUgx <= 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        categoryId,
        limitUgx: Math.round(limitUgx),
        period,
        color: budget?.color ?? "oklch(0.56 0.14 152)",
      };
      if (budget) {
        await api.patch(`/api/budgets/${budget.id}`, payload);
      } else {
        await api.post("/api/budgets", payload);
      }
      gooeyToast.success(budget ? "Budget updated" : "Budget added", {
        description: `${name.trim()} · ${display.formatMoney(limitUgx)} per ${period}`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save budget", { description: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={budget ? "Edit budget" : "Add budget"}
      hint="A limit for one category or the whole month."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(budget)}
    >
      <Input label="Name" value={name} onChange={setName} placeholder="Food" />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Category:</p>
        <CategorySelect
          value={categoryId}
          onValueChange={setCategoryId}
          allLabel="All categories"
          compact
          className="w-40 min-[360px]:w-52"
        />
      </div>
      <Input
        label={`Limit (${display.unit})`}
        value={limit}
        onChange={(value) =>
          setLimit(formatNumericInput(value, moneyInputDecimals(display)))
        }
        placeholder={moneyInputValue(display, 800_000)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Period:</p>
        <DropdownSelect
          value={period}
          onValueChange={(value) =>
            setPeriod(value as Budget["period"])
          }
          ariaLabel="Budget period"
          className="w-40 min-[360px]:w-52"
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "weekly", label: "Weekly" },
          ]}
        />
      </div>
    </FormShell>
  );
}

function RecurringForm({
  rule,
  accounts,
  defaultAccountId,
  onSaved,
  onCancel,
}: {
  rule: RecurringRule | null;
  accounts: Account[];
  defaultAccountId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const display = useCurrency();
  const { categoriesFor } = useCategories();
  const [name, setName] = useState(rule?.name ?? "");
  const [type, setType] = useState<TransactionType>(rule?.type ?? "expense");
  const [amount, setAmount] = useState(
    rule ? moneyInputValue(display, rule.amountUgx) : "",
  );
  const [category, setCategory] = useState(
    rule?.category || categoriesFor(rule?.type === "income" ? "income" : "expense")[0].id,
  );
  const [accountId, setAccountId] = useState(
    rule?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(
    rule?.toAccountId ??
      accounts.find(
        (account) =>
          account.id !== (rule?.accountId ?? defaultAccountId ?? accounts[0]?.id),
      )?.id ??
      "",
  );
  const [frequency, setFrequency] = useState<RecurringRule["frequency"]>(
    rule?.frequency ?? "monthly",
  );
  const [nextOn, setNextOn] = useState(rule?.nextOn ?? ymd(new Date()));
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [note, setNote] = useState(rule?.note ?? "");
  const [saving, setSaving] = useState(false);

  const isTransfer = type === "transfer";

  function changeType(next: TransactionType) {
    setType(next);
    if (next === "transfer") return;
    const options = categoriesFor(next === "income" ? "income" : "expense");
    if (!options.some((option) => option.id === category)) {
      setCategory(options[0].id);
    }
  }

  async function submit() {
    const amountUgx = moneyInputAmount(amount);
    if (!name.trim() || !Number.isFinite(amountUgx) || amountUgx <= 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        amountUgx: Math.round(amountUgx),
        category: isTransfer ? "" : category,
        accountId,
        toAccountId: isTransfer ? toAccountId : undefined,
        frequency,
        nextOn,
        enabled,
        note,
      };
      if (rule) {
        await api.patch(`/api/recurring/${rule.id}`, payload);
      } else {
        await api.post("/api/recurring", payload);
      }
      gooeyToast.success(rule ? "Rule updated" : "Rule added", {
        description: `${name.trim()} · ${display.formatMoney(amountUgx)} ${frequency}`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save rule", { description: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={rule ? "Edit recurring rule" : "Add recurring rule"}
      hint="It will appear here until you run what is due."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(rule)}
    >
      <Input label="Name" value={name} onChange={setName} placeholder="Rent" />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Type:</p>
        <DropdownSelect
          value={type}
          onValueChange={(value) =>
            changeType(value as TransactionType)
          }
          ariaLabel="Recurring type"
          className="w-40 min-[360px]:w-52"
          options={TYPES}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={`Amount (${display.unit})`}
          value={amount}
          onChange={(value) =>
            setAmount(formatNumericInput(value, moneyInputDecimals(display)))
          }
          placeholder={moneyInputValue(display, 900_000)}
        />
        <label className="block">
          <span className="mb-1 block text-[13px] text-muted-foreground">Next date</span>
          <input
            type="date"
            value={nextOn}
            onChange={(event) => setNextOn(event.target.value)}
            className="h-10 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-sm outline-none focus-visible:border-foreground/50 focus-visible:ring-0"
          />
        </label>
      </div>
      {!isTransfer ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-muted-foreground">Category:</p>
          <CategorySelect
            value={category}
            onValueChange={setCategory}
            kind={type === "income" ? "income" : "expense"}
            compact
            className="w-40 min-[360px]:w-52"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">
          {isTransfer ? "From:" : "Account:"}
        </p>
        <AccountSelect
          label={isTransfer ? "From" : "Account"}
          value={accountId}
          accounts={accounts}
          onValueChange={setAccountId}
          compact
          hideLabel
          className="w-40 min-[360px]:w-52"
        />
      </div>
      {isTransfer ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-muted-foreground">To:</p>
          <AccountSelect
            label="To"
            value={toAccountId}
            accounts={accounts}
            onValueChange={setToAccountId}
            compact
            hideLabel
            className="w-40 min-[360px]:w-52"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Frequency:</p>
        <DropdownSelect
          value={frequency}
          onValueChange={(value) =>
            setFrequency(value as RecurringRule["frequency"])
          }
          ariaLabel="Recurring frequency"
          className="w-40 min-[360px]:w-52"
          options={FREQUENCIES.map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          }))}
        />
      </div>
      <Checkbox checked={enabled} onCheckedChange={setEnabled} label="Enabled" />
      <Input label="Note" value={note} onChange={setNote} placeholder="Optional" />
    </FormShell>
  );
}
