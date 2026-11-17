"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { gooeyToast } from "goey-toast";
import {
  Camera01Icon,
  Cancel01Icon,
  Delete02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { categoriesFor, categoryOf } from "@/lib/categories";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { Input } from "@/components/motion/input";
import { AccountSelect } from "@/components/account-select";
import { CategorySelect } from "@/components/category-select";
import { Icon } from "@/components/huge-icon";
import { Button } from "@/components/ui/button";
import { api, useApi } from "@/lib/use-api";
import { daysInMonth, formatAmount, formatNumber, parseYmd, ymd } from "@/lib/format";
import type {
  Account,
  Currency,
  Settings,
  Transaction,
  TransactionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
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
/** Temporarily hidden: quick amounts and mock receipt scan. */
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
        className={mode === "quick-add" ? "max-w-2xl" : "max-w-xl"}
        ariaLabel={
          mode === "quick-add"
            ? "Quick add transactions"
            : editing
              ? "Edit transaction"
              : "Add transaction"
        }
      >
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
          <QuickAddForm
            key="quick-add"
            accounts={accounts}
            settings={settingsData}
            onSaved={saved}
            onCancel={close}
          />
        ) : null}
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
  const initial = transaction ? parseYmd(transaction.spentOn) : new Date();
  const years = [initial.getFullYear() - 2, initial.getFullYear() - 1, initial.getFullYear()];
  const defaultAccountId = settings?.defaultAccountId ?? accounts[0]?.id ?? "";
  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [currency, setCurrency] = useState<Currency>(
    transaction?.currency ?? settings?.defaultCurrency ?? "UGX",
  );
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
  const [fee, setFee] = useState(transaction?.feeUgx ? String(transaction.feeUgx) : "");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [day, setDay] = useState(initial.getDate());
  const [saving, setSaving] = useState(false);

  const isTransfer = type === "transfer";
  const maxDay = daysInMonth(`${year}-${String(month + 1).padStart(2, "0")}`);
  const safeDay = Math.min(day, maxDay);
  const spentOn = ymd(new Date(year, month, safeDay));
  const numeric = Number(amount);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const showFee = type !== "income" && selectedAccount?.type === "momo";
  const valid =
    Number.isFinite(numeric) &&
    numeric > 0 &&
    Boolean(accountId) &&
    (isTransfer ? Boolean(toAccountId) && toAccountId !== accountId : Boolean(category));

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

  function scanReceipt(file: File | undefined) {
    if (!file) return;
    setAmount("48500");
    setCurrency("UGX");
    setCategory("shopping");
    setNote("Supermarket receipt");
    gooeyToast.success("Receipt scanned", {
      description: "Mock OCR filled the form. Review before saving.",
    });
  }

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amount: numeric,
        currency: isTransfer ? "UGX" : currency,
        category: isTransfer ? "" : category,
        accountId,
        toAccountId: isTransfer ? toAccountId : undefined,
        feeUgx: showFee ? Number(fee) || 0 : 0,
        note,
        spentOn,
        source: transaction?.source ?? "manual",
      };
      if (transaction) {
        await api.patch(`/api/transactions/${transaction.id}`, payload);
        gooeyToast.success("Transaction updated", {
          description: isTransfer
            ? formatAmount(numeric, "UGX")
            : `${formatAmount(numeric, currency)}, ${categoryOf(category).label}`,
        });
      } else {
        await api.post("/api/transactions", payload);
        gooeyToast.success(
          type === "income" ? "Income added" : type === "transfer" ? "Transfer saved" : "Expense logged",
          {
            description: isTransfer
              ? formatAmount(numeric, "UGX")
              : `${formatAmount(numeric, currency)}, ${categoryOf(category).label}`,
          },
        );
      }
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!transaction) return;
    setSaving(true);
    try {
      await api.delete(`/api/transactions/${transaction.id}`);
      gooeyToast.success("Transaction deleted");
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not delete", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
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

      <div className="flex rounded-full border border-border bg-muted p-0.5">
        {TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => changeType(option.value)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              type === option.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-baseline gap-2 border-b border-border pb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {isTransfer ? "UGX" : currency === "UGX" ? "UGX" : "USD"}
        </span>
        <input
          autoFocus
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          inputMode="decimal"
          placeholder="0"
          className="tnum w-full bg-transparent text-5xl font-semibold tracking-[-0.03em] outline-none placeholder:text-muted-foreground/35"
          aria-label="Amount"
        />
      </div>

      {/* Temporarily disabled: quick amount presets and mock receipt scan. */}
      {SHOW_AMOUNT_SHORTCUTS ? (
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
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

      {isTransfer ? (
        <div className="space-y-3">
          <FieldRow label="From">
            <AccountSelect
              label="From"
              value={accountId}
              accounts={accounts}
              onValueChange={setAccountId}
              hideLabel
            />
          </FieldRow>
          <FieldRow label="To">
            <AccountSelect
              label="To"
              value={toAccountId}
              accounts={accounts}
              onValueChange={setToAccountId}
              hideLabel
            />
          </FieldRow>
        </div>
      ) : (
        <FieldRow label="Account">
          <AccountSelect
            label="Account"
            value={accountId}
            accounts={accounts}
            onValueChange={setAccountId}
            hideLabel
          />
        </FieldRow>
      )}

      {showFee ? (
        <Input
          label="MoMo fee (UGX)"
          value={fee}
          onChange={(value) => setFee(value.replace(/[^0-9]/g, ""))}
          placeholder="0"
          classNames={UNDERLINE_FIELD}
        />
      ) : null}

      {!isTransfer ? (
        <FieldRow label="Category">
          <CategorySelect
            value={category}
            onValueChange={setCategory}
            kind={type === "income" ? "income" : "expense"}
            label="Category"
          />
        </FieldRow>
      ) : null}

      <div>
        <p className="mb-1 text-[13px] text-muted-foreground">When</p>
        <div className="flex items-center gap-1">
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

      <Input
        label="Note"
        value={note}
        onChange={setNote}
        placeholder="What was it?"
        classNames={UNDERLINE_FIELD}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        {transaction ? (
          <Button variant="ghost" onClick={remove} disabled={saving} className="text-destructive">
            <Icon icon={Delete02Icon} className="size-4" /> Delete
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            <Icon icon={Cancel01Icon} className="size-4" /> Cancel
          </Button>
        )}
        <Button onClick={submit} disabled={!valid || saving} className="min-w-32">
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

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-20 shrink-0 text-[13px] text-muted-foreground">{label}</p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
