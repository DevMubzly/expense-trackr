"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { gooeyToast } from "goey-toast";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";
import { api as convexApi } from "../../convex/_generated/api";
import {
  Camera01Icon,
  Cancel01Icon,
  Delete02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { useCategories } from "@/components/categories-provider";
import { DropdownSelect } from "@/components/dropdown-select";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { Input } from "@/components/motion/input";
import { AccountSelect } from "@/components/account-select";
import { CategorySelect } from "@/components/category-select";
import { TimeSelect } from "@/components/time-select";
import { Icon } from "@/components/huge-icon";
import { Button } from "@/components/ui/button";
import {
  asTransactionId,
  toAccountInput,
  toCategoryInput,
} from "@/lib/convex-transactions";
import { useApi } from "@/lib/use-api";
import {
  CURRENCY_META,
  CURRENCY_OPTIONS,
} from "@/lib/currencies";
import {
  daysInMonth,
  formatAmount,
  formatNumber,
  formatNumericInput,
  parseNumericInput,
  parseYmd,
  ymd,
} from "@/lib/format";
import type {
  Account,
  Currency,
  Settings,
  Transaction,
  TransactionType,
} from "@/lib/types";
import { QuickAddForm } from "@/components/quick-add";

type DialogContextValue = {
  version: number;
  bumpVersion: () => void;
  openTransaction: (transaction?: Transaction, type?: TransactionType) => void;
  openExpense: (transaction?: Transaction) => void;
  openQuickAdd: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useTransactionDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useTransactionDialog must be used inside TransactionDialogProvider");
  }
  return context;
}

/** Backwards-compatible aliases for older callers. */
export const useExpenseDialog = useTransactionDialog;
export const ExpenseDialogProvider = TransactionDialogProvider;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRESETS = [5000, 10000, 20000, 50000];

function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function timeFromIso(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? timeFromDate(new Date()) : timeFromDate(date);
}
/** Temporarily hidden: quick amounts and receipt scan. */
const SHOW_AMOUNT_SHORTCUTS = false;
const UNDERLINE_FIELD = {
  field:
    "h-10 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent data-[state=focused]:ring-0",
  input: "text-sm",
};
const TYPES: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

export function TransactionDialogProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [mode, setMode] = useState<"transaction" | "quick-add" | null>(null);
  const [initialType, setInitialType] = useState<TransactionType>("expense");
  const [version, setVersion] = useState(0);
  const { data: accountsData } = useApi<Account[]>(`/api/accounts?v=${version}`);
  const { data: settingsData } = useApi<Settings>(`/api/settings?v=${version}`);
  const accounts = useMemo(() => accountsData ?? [], [accountsData]);

  const openTransaction = useCallback(
    (transaction?: Transaction, type: TransactionType = "expense") => {
      setEditing(transaction ?? null);
      setInitialType(transaction?.type ?? type);
      setMode("transaction");
    },
    [],
  );

  const openExpense = useCallback(
    (transaction?: Transaction) => openTransaction(transaction, "expense"),
    [openTransaction],
  );

  const openQuickAdd = useCallback(() => {
    setEditing(null);
    setMode("quick-add");
  }, []);

  const close = useCallback(() => {
    setMode(null);
    setEditing(null);
  }, []);

  const bumpVersion = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  const saved = useCallback(() => {
    bumpVersion();
    close();
  }, [bumpVersion, close]);

  const value = useMemo(
    () => ({ version, bumpVersion, openTransaction, openExpense, openQuickAdd }),
    [bumpVersion, openExpense, openQuickAdd, openTransaction, version],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      <MorphingModal
        viewId={mode}
        onClose={close}
        placement="center"
        className="max-w-xl text-foreground"
        contentClassName="p-1"
        ariaLabel={
          mode === "quick-add"
            ? "Quick add transactions"
            : editing
              ? "Edit transaction"
              : "Add transaction"
        }
      >
        <div className="mx-auto w-full max-w-xl">
        {mode === "transaction" ? (
          <TransactionForm
            key={editing?.id ?? `new-${initialType}`}
            transaction={editing}
            initialType={initialType}
            accounts={accounts}
            settings={settingsData}
            onSaved={saved}
            onCancel={close}
          />
        ) : null}
        {mode === "quick-add" ? (
          <div className="rounded-xl border border-foreground/10 bg-muted/50 p-3.5 pb-2">
          <QuickAddForm
            key="quick-add"
            accounts={accounts}
            settings={settingsData}
            onSaved={saved}
            onCancel={close}
          />
          </div>
        ) : null}
        </div>
      </MorphingModal>
    </DialogContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Transaction form                                                           */
/* -------------------------------------------------------------------------- */

function TransactionForm({
  transaction,
  initialType,
  accounts,
  settings,
  onSaved,
  onCancel,
}: {
  transaction: Transaction | null;
  initialType: TransactionType;
  accounts: Account[];
  settings: Settings | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { categoriesFor, categoryOf } = useCategories();
  const createTransaction = useMutation(convexApi.transactions.create);
  const updateTransaction = useMutation(convexApi.transactions.update);
  const removeTransaction = useMutation(convexApi.transactions.remove);
  const initial = transaction ? parseYmd(transaction.spentOn) : new Date();
  const years = [initial.getFullYear() - 2, initial.getFullYear() - 1, initial.getFullYear()];
  const defaultAccountId = settings?.defaultAccountId ?? accounts[0]?.id ?? "";
  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType);
  const initialCurrency: Currency =
    transaction?.currency ?? settings?.defaultCurrency ?? "UGX";
  const [amount, setAmount] = useState(
    transaction
      ? formatNumericInput(
          String(transaction.amount),
          CURRENCY_META[initialCurrency].decimals > 0,
        )
      : "",
  );
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [accountId, setAccountId] = useState(transaction?.accountId ?? defaultAccountId);
  const [toAccountId, setToAccountId] = useState(
    transaction?.toAccountId ?? accounts.find((account) => account.id !== (transaction?.accountId ?? defaultAccountId))?.id ?? "",
  );
  const [category, setCategory] = useState(
    transaction?.category ??
      categoriesFor(
        (transaction?.type ?? initialType) === "income" ? "income" : "expense",
      )[0].id,
  );
  const [fee, setFee] = useState(
    transaction?.feeUgx ? formatNumericInput(String(transaction.feeUgx)) : "",
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [spentTime, setSpentTime] = useState(
    transaction?.spentTime ?? timeFromIso(transaction?.createdAt ?? new Date().toISOString()),
  );
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [day, setDay] = useState(initial.getDate());
  const [saving, setSaving] = useState(false);

  const isTransfer = type === "transfer";
  const maxDay = daysInMonth(`${year}-${String(month + 1).padStart(2, "0")}`);
  const safeDay = Math.min(day, maxDay);
  const spentOn = ymd(new Date(year, month, safeDay));
  const numeric = parseNumericInput(amount);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const destinationAccount = accounts.find(
    (account) => account.id === toAccountId,
  );
  const showFee = type !== "income" && selectedAccount?.type === "momo";
  const valid =
    Number.isFinite(numeric) &&
    numeric > 0 &&
    Boolean(selectedAccount) &&
    (isTransfer
      ? Boolean(destinationAccount) && toAccountId !== accountId
      : Boolean(category));

  function changeType(next: TransactionType) {
    setType(next);
    if (next === "transfer") {
      setCurrency("UGX");
      setFee("");
      if (!toAccountId || toAccountId === accountId) {
        setToAccountId(accounts.find((account) => account.id !== accountId)?.id ?? "");
      }
      return;
    }
    const nextCategories = categoriesFor(next === "income" ? "income" : "expense");
    if (!nextCategories.some((option) => option.id === category)) {
      setCategory(nextCategories[0].id);
    }
    setFee("");
  }

  function changeCurrency(next: Currency) {
    if (next === currency) return;
    const entered = parseNumericInput(amount);
    const decimals = CURRENCY_META[next].decimals;
    if (entered > 0) {
      setAmount(
        formatNumericInput(
          decimals > 0 ? entered.toFixed(decimals) : String(Math.round(entered)),
          decimals > 0,
        ),
      );
    }
    setCurrency(next);
  }

  function scanReceipt(file: File | undefined) {
    if (!file) return;
    setAmount(formatNumericInput("48500"));
    setCurrency("UGX");
    setCategory("shopping");
    setNote("Supermarket receipt");
    gooeyToast.success("Receipt scanned", {
      description: "Receipt filled the form. Review before saving.",
    });
  }

  async function submit() {
    if (!valid || saving || !selectedAccount) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amount: numeric,
        currency: isTransfer ? "UGX" : currency,
        account: toAccountInput(selectedAccount),
        category: isTransfer ? undefined : toCategoryInput(categoryOf(category)),
        toAccount:
          isTransfer && destinationAccount
            ? toAccountInput(destinationAccount)
            : undefined,
        feeUgx: showFee ? parseNumericInput(fee) : 0,
        note,
        spentOn,
        spentTime: spentTime || undefined,
        source: transaction?.source ?? "manual",
      };
      const spentLabel = parseYmd(spentOn).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
      const amountLabel = formatAmount(numeric, isTransfer ? "UGX" : currency);
      const categoryLabel = categoryOf(category).label;
      const transferFrom = selectedAccount.name;
      const transferTo = destinationAccount?.name ?? "account";

      if (transaction) {
        await updateTransaction({
          transactionId: asTransactionId(transaction.id),
          ...payload,
        });
        gooeyToast.success("Transaction updated", {
          description: isTransfer
            ? `${amountLabel} moved from ${transferFrom} to ${transferTo} on ${spentLabel}.`
            : `${amountLabel} · ${categoryLabel} on ${spentLabel}.`,
        });
      } else {
        await createTransaction(payload);
        gooeyToast.success(
          type === "income"
            ? "Income added"
            : type === "transfer"
              ? "Transfer saved"
              : "Expense logged",
          {
            description: isTransfer
              ? `${amountLabel} moved from ${transferFrom} to ${transferTo} on ${spentLabel}.`
              : `${amountLabel} · ${categoryLabel} on ${spentLabel}.`,
          },
        );
      }
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save transaction", {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!transaction) return;
    setSaving(true);
    try {
      await removeTransaction({
        transactionId: asTransactionId(transaction.id),
      });
      gooeyToast.success("Transaction deleted", {
        description: `${formatAmount(
          transaction.amountUgx,
          transaction.currency,
        )} was removed from your ledger.`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not delete transaction", {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[min(720px,calc(100dvh-4.5rem))] max-h-[calc(100dvh-4.5rem)] flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto rounded-xl border border-foreground/10 bg-muted/50 p-3.5 pb-2">
        <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            {transaction
              ? "Edit transaction"
              : type === "income"
                ? "Add income"
                : type === "transfer"
                  ? "Transfer money"
                  : "Log an expense"}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {transaction ? "Fix the details and save." : "Takes a few seconds."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Type:</p>
        <DropdownSelect
          value={type}
          onValueChange={(value) =>
            changeType(value as TransactionType)
          }
          ariaLabel="Transaction type"
          className="w-40 min-[360px]:w-52"
          options={TYPES}
        />
      </div>

      {!isTransfer ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-muted-foreground">Currency:</p>
          <DropdownSelect
            value={currency}
            onValueChange={(value) => changeCurrency(value as Currency)}
            ariaLabel="Transaction currency"
            className="w-40 min-[360px]:w-52"
            options={CURRENCY_OPTIONS}
          />
        </div>
      ) : null}

      <div className="flex w-56 items-end gap-2 pb-2">
        <span className="pb-1 text-sm font-medium text-muted-foreground">
          {isTransfer ? "UGX" : CURRENCY_META[currency].symbol}
        </span>
        <div className="min-w-0 flex-1 border-b border-border">
          <input
            autoFocus
            value={amount}
            onChange={(event) =>
              setAmount(
                formatNumericInput(
                  event.target.value,
                  CURRENCY_META[currency].decimals > 0,
                ),
              )
            }
            onKeyDown={(event) => event.key === "Enter" && submit()}
            inputMode="decimal"
            placeholder="0"
            className="tnum w-full bg-transparent text-4xl font-semibold tracking-[-0.03em] outline-none placeholder:text-muted-foreground/35"
            aria-label="Amount"
          />
        </div>
      </div>

      {/* Temporarily disabled: quick amount presets and receipt scan. */}
      {SHOW_AMOUNT_SHORTCUTS ? (
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(formatNumericInput(String(preset)))}
              className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {formatNumber(preset)}
            </button>
          ))}
          {type === "expense" ? (
            <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
              <Icon icon={Camera01Icon} className="size-3.5" /> Scan receipt
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  scanReceipt(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={type}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          className="space-y-3"
        >
          {isTransfer ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[13px] text-muted-foreground">From:</p>
                <AccountSelect
                  label="From"
                  value={accountId}
                  accounts={accounts}
                  onValueChange={setAccountId}
                  hideLabel
                  className="w-40 min-[360px]:w-52"
                />
              </div>
              <AnimatePresence initial={false}>
                {showFee ? <FeeField key="fee" fee={fee} onChange={setFee} /> : null}
              </AnimatePresence>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[13px] text-muted-foreground">To:</p>
                <AccountSelect
                  label="To"
                  value={toAccountId}
                  accounts={accounts}
                  onValueChange={setToAccountId}
                  hideLabel
                  className="w-40 min-[360px]:w-52"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[13px] text-muted-foreground">Account:</p>
                <AccountSelect
                  label="Account"
                  value={accountId}
                  accounts={accounts}
                  onValueChange={setAccountId}
                  hideLabel
                  className="w-40 min-[360px]:w-52"
                />
              </div>
              <AnimatePresence initial={false}>
                {showFee ? <FeeField key="fee" fee={fee} onChange={setFee} /> : null}
              </AnimatePresence>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[13px] text-muted-foreground">Category:</p>
                <CategorySelect
                  value={category}
                  onValueChange={setCategory}
                  kind={type === "income" ? "income" : "expense"}
                  label="Category"
                  className="w-40 min-[360px]:w-52"
                />
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <p className="w-20 shrink-0 text-[13px] text-muted-foreground">When:</p>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <WheelPicker
            options={Array.from({ length: maxDay }, (_, index) => String(index + 1))}
            value={String(safeDay)}
            onValueChange={(value) => setDay(Number(value))}
            visibleCount={3}
            itemHeight={34}
            className="flex-1 rounded-none border-0 bg-transparent"
            aria-label="Day"
          />
          <WheelPicker
            options={MONTHS.map((label, index) => ({ label, value: String(index) }))}
            value={String(month)}
            onValueChange={(value) => setMonth(Number(value))}
            visibleCount={3}
            itemHeight={34}
            className="flex-1 rounded-none border-0 bg-transparent"
            aria-label="Month"
          />
          <WheelPicker
            options={years.map((value) => String(value))}
            value={String(year)}
            onValueChange={(value) => setYear(Number(value))}
            visibleCount={3}
            itemHeight={34}
            className="flex-1 rounded-none border-0 bg-transparent"
            aria-label="Year"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="w-20 shrink-0 text-[13px] text-muted-foreground">Time:</p>
        <TimeSelect value={spentTime} onValueChange={setSpentTime} />
      </div>

      <div className="flex items-center gap-2">
        <p className="w-20 shrink-0 text-[13px] text-muted-foreground">Note:</p>
        <div className="min-w-0 flex-1">
          <Input
            value={note}
            onChange={setNote}
            placeholder="What was it?"
            aria-label="Note"
            classNames={UNDERLINE_FIELD}
          />
        </div>
      </div>

      </div>

      <div className="mt-1 flex shrink-0 items-center justify-between gap-2">
        {transaction ? (
          <Button variant="ghost" onClick={remove} loading={saving} className="text-destructive">
            <Icon icon={Delete02Icon} className="size-4" /> Delete
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            <Icon icon={Cancel01Icon} className="size-4" /> Cancel
          </Button>
        )}
        <Button onClick={submit} loading={saving} disabled={!valid} className="min-w-32">
          <Icon icon={Tick02Icon} className="size-4" />
          {transaction
            ? "Save changes"
            : type === "income"
              ? "Add income"
              : type === "transfer"
                ? "Transfer"
                : "Log it"}
        </Button>
      </div>
    </div>
  );
}

function FeeField({
  fee,
  onChange,
}: {
  fee: string;
  onChange: (value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16, ease: EASE_OUT }}
      className="flex flex-wrap items-center gap-3"
    >
      <p className="shrink-0 text-[13px] text-muted-foreground">Transaction fee:</p>
      <Input
        value={fee}
        onChange={(value) => onChange(formatNumericInput(value))}
        placeholder="0"
        aria-label="Transaction fee (UGX)"
        className="w-40 min-[360px]:w-52"
        classNames={UNDERLINE_FIELD}
      />
    </motion.div>
  );
}
