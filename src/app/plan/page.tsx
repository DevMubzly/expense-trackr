"use client";

import { useMemo, useState } from "react";
import { gooeyToast } from "goey-toast";
import {
  ArrowDown02Icon,
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
import { MetricCard } from "@/components/metric-card";
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
import { PageLoader } from "@/components/page-loader";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { MorphingTabs } from "@/components/motion/morphing-tabs";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { useTransactionDialog } from "@/components/expense-dialog";
import { useApi, api } from "@/lib/use-api";
import { categoriesFor } from "@/lib/categories";
import {
  addDays,
  formatNumber,
  formatNumericInput,
  parseNumericInput,
  parseYmd,
  ymd,
} from "@/lib/format";
import { PERIOD_LABELS, PERIOD_OPTIONS } from "@/lib/periods";
import type {
  Account,
  Budget,
  BudgetProgress,
  Debt,
  Goal,
  NetWorth,
  PeriodPoint,
  RecurringRule,
  StatPeriod,
  Stats,
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

function shapeSeries(
  points: readonly PeriodPoint[],
  key: "expense" | "income" | "net" | "count",
  value: number,
  fromRatio: number,
) {
  if (points.length === 0) return [];
  const series = points.map((point) => Math.abs(Number(point[key]) || 0));
  const max = Math.max(...series, 1);

  return points.map((point, index) => {
    const progress = points.length > 1 ? index / (points.length - 1) : 1;
    const trend = fromRatio + (1 - fromRatio) * progress;
    const wave = (series[index] / max - 0.5) * 0.22;
    return {
      label: point.label,
      value: Math.round(value * (trend + wave)),
    };
  });
}

export default function PlanPage() {
  const { version, bumpVersion } = useTransactionDialog();
  const goalsApi = useApi<Goal[]>(`/api/goals?v=${version}`);
  const debtsApi = useApi<Debt[]>(`/api/debts?v=${version}`);
  const budgetsApi = useApi<BudgetProgress[]>(`/api/budgets?v=${version}`);
  const recurringApi = useApi<RecurringRule[]>(`/api/recurring?v=${version}`);
  const netWorthApi = useApi<NetWorth>(`/api/networth?v=${version}`);
  const accountsApi = useApi<Account[]>(`/api/accounts?v=${version}`);
  const [period, setPeriod] = useState<StatPeriod>("30d");
  const statsApi = useApi<Stats>(`/api/stats?period=${period}&v=${version}`);
  const [modal, setModal] = useState<ModalState>(null);

  const goals = goalsApi.data ?? [];
  const debts = debtsApi.data ?? [];
  const budgets = budgetsApi.data ?? [];
  const recurring = recurringApi.data ?? [];
  const accounts = accountsApi.data ?? [];
  const netWorth = netWorthApi.data;
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const borrowed = debts
    .filter((debt) => debt.direction === "borrowed")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const lent = debts
    .filter((debt) => debt.direction === "lent")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const goalsFunded = goals.filter(
    (goal) => goal.savedUgx >= goal.targetUgx,
  ).length;
  const goalsSaved = goals.reduce(
    (total, goal) => total + goal.savedUgx,
    0,
  );
  const periodSpark = useMemo(
    () => statsApi.data?.period.spark ?? [],
    [statsApi.data?.period.spark],
  );
  const netWorthSpark = useMemo(
    () =>
      shapeSeries(periodSpark, "net", netWorth?.total ?? 0, 0.82),
    [netWorth?.total, periodSpark],
  );
  const borrowedSpark = useMemo(
    () => shapeSeries(periodSpark, "expense", borrowed, 1.3),
    [borrowed, periodSpark],
  );
  const lentSpark = useMemo(
    () => shapeSeries(periodSpark, "income", lent, 0.7),
    [lent, periodSpark],
  );
  const goalsSpark = useMemo(
    () => shapeSeries(periodSpark, "income", goalsSaved, 0.55),
    [goalsSaved, periodSpark],
  );

  const ready =
    goalsApi.data && debtsApi.data && budgetsApi.data && recurringApi.data;

  if (!ready) {
    return <PageLoader variant="helix" size={30} />;
  }

  function refreshAll() {
    goalsApi.refresh();
    debtsApi.refresh();
    budgetsApi.refresh();
    recurringApi.refresh();
    netWorthApi.refresh();
    accountsApi.refresh();
  }

  function saved() {
    setModal(null);
    refreshAll();
    bumpVersion();
  }

  async function remove(kind: ModalKind, id: string) {
    const path = kind === "recurring" ? "recurring" : `${kind}s`;
    await api.delete(`/api/${path}/${id}`);
    const label =
      kind === "goal"
        ? "Goal"
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
  }

  async function toggleRule(rule: RecurringRule, enabled: boolean) {
    await api.patch(`/api/recurring/${rule.id}`, { enabled });
    refreshAll();
    bumpVersion();
  }

  async function runDue() {
    const result = await api.post<{ created: number }>("/api/recurring/run", {});
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
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-5xl leading-none md:text-[56px]">
            Give the money a job.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Goals, debts, budgets and the bills that keep coming back. All of it runs on the
            mock ledger.
          </p>
        </div>
        <Combobox
          value={period}
          onValueChange={(value) => setPeriod(value as StatPeriod)}
          className="w-36 shrink-0"
        >
          <ComboboxTrigger className="h-9 min-w-0 rounded-full px-2.5">
            <ComboboxInput
              aria-label="Metric timeframe"
              placeholder="Timeframe"
              className="h-9 text-[13px]"
              showIcon={false}
            />
          </ComboboxTrigger>
          <ComboboxContent className="w-52 rounded-2xl">
            <ComboboxList ariaLabel="Metric timeframe" className="p-2">
              <ComboboxEmpty>No timeframes.</ComboboxEmpty>
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

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <MetricCard
          className="col-span-2 lg:col-span-1"
          label="Net worth"
          value={
            netWorthSpark[netWorthSpark.length - 1]?.value ??
            netWorth?.total ??
            0
          }
          foot={`${PERIOD_LABELS[period]} · ${formatNumber(netWorth?.assets ?? 0)} assets · ${formatNumber(netWorth?.liabilities ?? 0)} debts`}
          spark={netWorthSpark}
          sparkKey="value"
          sparkLabelKey={(point) => point.label}
          icon={Wallet02Icon}
          tone="sky"
        />
        <MetricCard
          label="You owe"
          value={borrowedSpark[borrowedSpark.length - 1]?.value ?? borrowed}
          foot={`${PERIOD_LABELS[period]} · borrowed balances`}
          spark={borrowedSpark}
          sparkKey="value"
          icon={ArrowUp02Icon}
          tone="rose"
        />
        <MetricCard
          label="Owed to you"
          value={lentSpark[lentSpark.length - 1]?.value ?? lent}
          foot={`${PERIOD_LABELS[period]} · lent balances`}
          spark={lentSpark}
          sparkKey="value"
          icon={ArrowDown02Icon}
          tone="emerald"
        />
        <MetricCard
          label="Goals saved"
          value={goalsSpark[goalsSpark.length - 1]?.value ?? goalsSaved}
          foot={`${PERIOD_LABELS[period]} · ${formatNumber(goalsFunded)} funded · ${formatNumber(
            goals.length,
          )} goals`}
          spark={goalsSpark}
          sparkKey="value"
          icon={Target01Icon}
          tone="violet"
        />
      </div>

      <MorphingTabs
        defaultValue="goals"
        align="center"
        showTabBorders={false}
        classNames={{
          root: "bg-transparent text-foreground",
          activeTab: "text-card",
          content: "bg-card text-card-foreground",
          tab: "justify-center text-center text-muted-foreground hover:text-foreground aria-selected:text-card-foreground",
        }}
        items={[
          {
            id: "goals",
            label: "Goals",
            content: (
              <Panel className="p-6">
                <PanelHeader
                  title="Savings goals"
                  hint="What the money is for"
                  action={
                    <Button variant="outline" size="sm" onClick={() => setModal({ kind: "goal", item: null })}>
                      <Icon icon={PlusSignIcon} className="size-4" /> Add goal
                    </Button>
                  }
                  className="p-0 pb-5"
                />
                {goals.length === 0 ? (
                  <EmptyState title="No goals yet" hint="Add a target and a deadline." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {goals.map((goal) => {
                      const pct = Math.min(
                        100,
                        Math.round((goal.savedUgx / Math.max(1, goal.targetUgx)) * 100),
                      );
                      const remaining = Math.max(0, goal.targetUgx - goal.savedUgx);
                      const months = monthsUntil(goal.deadline);
                      return (
                        <div
                          key={goal.id}
                          className="rounded-2xl bg-muted/20 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-lg"
                              style={{
                                background: `color-mix(in oklab, ${goal.color} 16%, transparent)`,
                              }}
                            >
                              <Icon icon={Target02Icon} className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium">{goal.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {dateLabel(goal.deadline)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setModal({ kind: "goal", item: goal })}
                              aria-label={`Edit ${goal.name}`}
                              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Icon icon={PencilEdit01Icon} className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove("goal", goal.id)}
                              aria-label={`Delete ${goal.name}`}
                              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Icon icon={Delete02Icon} className="size-3.5" />
                            </button>
                          </div>
                          <div className="mt-4 flex items-end justify-between gap-3">
                            <Money value={goal.savedUgx} size="md" />
                            <span className="text-[11px] text-muted-foreground">
                              of {formatNumber(goal.targetUgx)} UGX
                            </span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: goal.color }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{pct}% funded</span>
                            <span>
                              {remaining > 0
                                ? `${formatNumber(Math.round(remaining / months))} UGX / month`
                                : "Goal reached"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            ),
          },
          {
            id: "debts",
            label: "Debts",
            content: (
              <Panel className="p-6">
                <PanelHeader
                  title="Debts"
                  hint="Money owed in both directions"
                  action={
                    <Button variant="outline" size="sm" onClick={() => setModal({ kind: "debt", item: null })}>
                      <Icon icon={PlusSignIcon} className="size-4" /> Add debt
                    </Button>
                  }
                  className="p-0 pb-5"
                />
                {debts.length === 0 ? (
                  <EmptyState title="No debts recorded" hint="Borrowed and lent balances live here." />
                ) : (
                  <ul className="space-y-2">
                    {debts.map((debt) => (
                      <li
                        key={debt.id}
                        className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/20 px-3 py-3"
                      >
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
                          <p className="truncate text-[13px]">{debt.counterparty}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Due {dateLabel(debt.dueOn)}
                            {debt.note ? ` · ${debt.note}` : ""}
                          </p>
                        </div>
                        <Money value={debt.balanceUgx} size="sm" />
                        <button
                          type="button"
                          onClick={() => setModal({ kind: "debt", item: debt })}
                          aria-label={`Edit debt with ${debt.counterparty}`}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Icon icon={PencilEdit01Icon} className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove("debt", debt.id)}
                          aria-label={`Delete debt with ${debt.counterparty}`}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Icon icon={Delete02Icon} className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            ),
          },
          {
            id: "recurring",
            label: "Recurring",
            content: (
              <Panel className="p-6">
                <PanelHeader
                  title="Recurring rules"
                  hint="Salary, rent and the subscriptions"
                  action={
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={runDue}>
                        Run due
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setModal({ kind: "recurring", item: null })}>
                        <Icon icon={PlusSignIcon} className="size-4" /> Add rule
                      </Button>
                    </div>
                  }
                  className="p-0 pb-5"
                />
                {recurring.length === 0 ? (
                  <EmptyState title="Nothing recurring yet" hint="Add salary, rent or subscriptions." />
                ) : (
                  <ul className="space-y-2">
                    {recurring.map((rule) => {
                      const account = accountById.get(rule.accountId);
                      const destination = rule.toAccountId
                        ? accountById.get(rule.toAccountId)
                        : null;
                      return (
                        <li
                          key={rule.id}
                          className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/20 px-3 py-3"
                        >
                          <Checkbox
                            checked={rule.enabled}
                            onCheckedChange={(enabled) => toggleRule(rule, enabled)}
                            aria-label={`Enable ${rule.name}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px]">{rule.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {rule.frequency} · next {dateLabel(rule.nextOn)}
                              {account ? ` · ${account.name}` : ""}
                              {destination ? ` → ${destination.name}` : ""}
                            </p>
                          </div>
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
                          <button
                            type="button"
                            onClick={() => setModal({ kind: "recurring", item: rule })}
                            aria-label={`Edit ${rule.name}`}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Icon icon={PencilEdit01Icon} className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove("recurring", rule.id)}
                            aria-label={`Delete ${rule.name}`}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Icon icon={Delete02Icon} className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            ),
          },
          {
            id: "budgets",
            label: "Budgets",
            content: (
              <Panel className="p-6">
                <PanelHeader
                  title="Budgets"
                  hint="This month's limits"
                  action={
                    <Button variant="outline" size="sm" onClick={() => setModal({ kind: "budget", item: null })}>
                      <Icon icon={PlusSignIcon} className="size-4" /> Add budget
                    </Button>
                  }
                  className="p-0 pb-5"
                />
                {budgets.length === 0 ? (
                  <EmptyState title="No budgets yet" hint="Set a limit and watch it move." />
                ) : (
                  <div className="space-y-4">
                    {budgets.map((budget) => {
                      const pct = Math.min(
                        100,
                        Math.round((budget.spentUgx / Math.max(1, budget.limitUgx)) * 100),
                      );
                      const over = budget.spentUgx > budget.limitUgx;
                      return (
                        <div key={budget.id} className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span
                                className="size-2.5 rounded-full"
                                style={{ background: budget.color }}
                              />
                              {budget.name}
                              <span className="text-[10px] text-muted-foreground">
                                {budget.categoryId === "all" ? "overall" : budget.categoryId}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={cn("tnum", over ? "text-destructive" : "text-foreground")}>
                                {formatNumber(budget.spentUgx)} / {formatNumber(budget.limitUgx)} UGX
                              </span>
                              <button
                                type="button"
                                onClick={() => setModal({ kind: "budget", item: budget })}
                                aria-label={`Edit ${budget.name}`}
                                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Icon icon={PencilEdit01Icon} className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => remove("budget", budget.id)}
                                aria-label={`Delete ${budget.name}`}
                                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Icon icon={Delete02Icon} className="size-3.5" />
                              </button>
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: over ? "var(--destructive)" : budget.color,
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {over
                              ? `${formatNumber(budget.spentUgx - budget.limitUgx)} UGX over`
                              : `${formatNumber(budget.limitUgx - budget.spentUgx)} UGX left`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            ),
          },
        ]}
      />

      <MorphingModal
        viewId={modal?.kind ?? null}
        onClose={() => setModal(null)}
        placement="center"
        className="max-w-lg"
        ariaLabel={modal ? `Edit ${modal.kind}` : "Plan item"}
      >
        {modal?.kind === "goal" ? (
          <GoalForm
            key={modal.item?.id ?? "new-goal"}
            goal={modal.item}
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
            onSaved={saved}
            onCancel={() => setModal(null)}
          />
        ) : null}
      </MorphingModal>
    </div>
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
  onDelete,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
  editing: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>
      </div>
      {children}
      <div className="flex items-center justify-between gap-2 pt-1">
        {onDelete ? (
          <Button variant="ghost" onClick={onDelete} disabled={saving} className="text-destructive">
            <Icon icon={Delete02Icon} className="size-4" /> Delete
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button onClick={onSubmit} disabled={saving}>
          <Icon icon={Tick02Icon} className="size-4" />
          {editing ? "Save changes" : "Add"}
        </Button>
      </div>
    </div>
  );
}

function GoalForm({
  goal,
  onSaved,
  onCancel,
}: {
  goal: Goal | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(
    goal ? formatNumericInput(String(goal.targetUgx)) : "",
  );
  const [saved, setSaved] = useState(
    goal ? formatNumericInput(String(goal.savedUgx)) : "0",
  );
  const [deadline, setDeadline] = useState(
    goal?.deadline ?? ymd(addDays(new Date(), 90)),
  );
  const [note, setNote] = useState(goal?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const targetUgx = parseNumericInput(target);
    if (!name.trim() || !Number.isFinite(targetUgx) || targetUgx <= 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        targetUgx: Math.round(targetUgx),
        savedUgx: Math.max(0, Math.round(parseNumericInput(saved))),
        deadline,
        note,
        color: goal?.color ?? "oklch(0.7 0.15 155)",
      };
      if (goal) {
        await api.patch(`/api/goals/${goal.id}`, payload);
      } else {
        await api.post("/api/goals", payload);
      }
      gooeyToast.success(goal ? "Goal updated" : "Goal added", {
        description: `${name.trim()} · ${formatNumber(Math.round(targetUgx))} UGX target`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save goal", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={goal ? "Edit goal" : "Add goal"}
      hint="A target, what is saved, and a deadline."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(goal)}
    >
      <Input label="Name" value={name} onChange={setName} placeholder="Emergency fund" />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Target (UGX)"
          value={target}
          onChange={(value) => setTarget(formatNumericInput(value))}
          placeholder="3000000"
        />
        <Input
          label="Saved (UGX)"
          value={saved}
          onChange={(value) => setSaved(formatNumericInput(value))}
          placeholder="0"
        />
      </div>
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
  const [direction, setDirection] = useState<Debt["direction"]>(
    debt?.direction ?? "borrowed",
  );
  const [counterparty, setCounterparty] = useState(debt?.counterparty ?? "");
  const [principal, setPrincipal] = useState(
    debt ? formatNumericInput(String(debt.principalUgx)) : "",
  );
  const [balance, setBalance] = useState(
    debt ? formatNumericInput(String(debt.balanceUgx)) : "",
  );
  const [dueOn, setDueOn] = useState(debt?.dueOn ?? ymd(addDays(new Date(), 30)));
  const [note, setNote] = useState(debt?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const principalUgx = parseNumericInput(principal);
    if (!counterparty.trim() || !Number.isFinite(principalUgx) || principalUgx <= 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        direction,
        counterparty: counterparty.trim(),
        principalUgx: Math.round(principalUgx),
        balanceUgx: Math.max(0, Math.round(parseNumericInput(balance) || principalUgx)),
        dueOn,
        note,
      };
      if (debt) {
        await api.patch(`/api/debts/${debt.id}`, payload);
      } else {
        await api.post("/api/debts", payload);
      }
      gooeyToast.success(debt ? "Debt updated" : "Debt added", {
        description: `${counterparty.trim()} · ${formatNumber(principalUgx)} UGX ${
          direction === "borrowed" ? "borrowed" : "lent"
        }`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save debt", { description: (error as Error).message });
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
      <div className="flex rounded-full border border-border bg-muted p-0.5">
        {(["borrowed", "lent"] as Debt["direction"][]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setDirection(option)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              direction === option
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {option === "borrowed" ? "I borrowed" : "I lent"}
          </button>
        ))}
      </div>
      <Input
        label="Counterparty"
        value={counterparty}
        onChange={setCounterparty}
        placeholder="Mum, Brian, SACCO"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Principal (UGX)"
          value={principal}
          onChange={(value) => setPrincipal(formatNumericInput(value))}
          placeholder="500000"
        />
        <Input
          label="Balance (UGX)"
          value={balance}
          onChange={(value) => setBalance(formatNumericInput(value))}
          placeholder="300000"
        />
      </div>
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
  const [name, setName] = useState(budget?.name ?? "");
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "all");
  const [limit, setLimit] = useState(
    budget ? formatNumericInput(String(budget.limitUgx)) : "",
  );
  const [period, setPeriod] = useState<Budget["period"]>(budget?.period ?? "monthly");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const limitUgx = parseNumericInput(limit);
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
        description: `${name.trim()} · ${formatNumber(limitUgx)} UGX per ${period}`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save budget", { description: (error as Error).message });
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
      <div>
        <p className="mb-1 text-[13px] text-muted-foreground">Category</p>
        <CategorySelect
          value={categoryId}
          onValueChange={setCategoryId}
          allLabel="All categories"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Limit (UGX)"
          value={limit}
          onChange={(value) => setLimit(formatNumericInput(value))}
          placeholder="800000"
        />
        <div>
          <p className="mb-1 text-[13px] text-muted-foreground">Period</p>
          <div className="flex rounded-full border border-border bg-muted p-0.5">
            {(["monthly", "weekly"] as Budget["period"][]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={cn(
                  "flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors",
                  period === option
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </FormShell>
  );
}

function RecurringForm({
  rule,
  accounts,
  onSaved,
  onCancel,
}: {
  rule: RecurringRule | null;
  accounts: Account[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [type, setType] = useState<TransactionType>(rule?.type ?? "expense");
  const [amount, setAmount] = useState(
    rule ? formatNumericInput(String(rule.amountUgx)) : "",
  );
  const [category, setCategory] = useState(
    rule?.category || categoriesFor(rule?.type === "income" ? "income" : "expense")[0].id,
  );
  const [accountId, setAccountId] = useState(
    rule?.accountId ?? accounts[0]?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(
    rule?.toAccountId ?? accounts.find((account) => account.id !== (rule?.accountId ?? accounts[0]?.id))?.id ?? "",
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
    const amountUgx = parseNumericInput(amount);
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
        description: `${name.trim()} · ${formatNumber(amountUgx)} UGX ${frequency}`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save rule", { description: (error as Error).message });
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
      <div className="flex rounded-full border border-border bg-muted p-0.5">
        {TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => changeType(option.value)}
            className={cn(
              "flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors",
              type === option.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount (UGX)"
          value={amount}
          onChange={(value) => setAmount(formatNumericInput(value))}
          placeholder="900000"
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
        <div>
          <p className="mb-1 text-[13px] text-muted-foreground">Category</p>
          <CategorySelect
            value={category}
            onValueChange={setCategory}
            kind={type === "income" ? "income" : "expense"}
          />
        </div>
      ) : null}
      <div className={isTransfer ? "grid grid-cols-2 gap-3" : ""}>
        <AccountSelect
          label={isTransfer ? "From" : "Account"}
          value={accountId}
          accounts={accounts}
          onValueChange={setAccountId}
        />
        {isTransfer ? (
          <AccountSelect
            label="To"
            value={toAccountId}
            accounts={accounts}
            onValueChange={setToAccountId}
          />
        ) : null}
      </div>
      <div>
        <p className="mb-1 text-[13px] text-muted-foreground">Frequency</p>
        <div className="flex rounded-full border border-border bg-muted p-0.5">
          {FREQUENCIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFrequency(option)}
              className={cn(
                "flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium capitalize transition-colors",
                frequency === option
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <Checkbox checked={enabled} onCheckedChange={setEnabled} label="Enabled" />
      <Input label="Note" value={note} onChange={setNote} placeholder="Optional" />
    </FormShell>
  );
}
