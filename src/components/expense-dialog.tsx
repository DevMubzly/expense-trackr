"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { gooeyToast } from "goey-toast";
import { Cancel01Icon, Delete02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { Input } from "@/components/motion/input";
import { Icon } from "@/components/huge-icon";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/use-api";
import { daysInMonth, formatAmount, formatNumber, parseYmd, ymd } from "@/lib/format";
import type { Currency, Expense } from "@/lib/types";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  version: number;
  openExpense: (expense?: Expense) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useExpenseDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useExpenseDialog must be used inside ExpenseDialogProvider");
  return context;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRESETS = [5000, 10000, 20000, 50000];

export function ExpenseDialogProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const openExpense = useCallback((expense?: Expense) => {
    setEditing(expense ?? null);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ version, openExpense }), [version, openExpense]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <MorphingModal
        viewId={open ? "expense" : null}
        onClose={() => setOpen(false)}
        placement="center"
        className="max-w-xl"
        ariaLabel={editing ? "Edit expense" : "Add expense"}
      >
        {open ? (
          <ExpenseForm
            key={editing?.id ?? "new"}
            expense={editing}
            onSaved={() => {
              setVersion((n) => n + 1);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </MorphingModal>
    </DialogContext.Provider>
  );
}

function ExpenseForm({
  expense,
  onSaved,
  onCancel,
}: {
  expense: Expense | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const initial = expense ? parseYmd(expense.spentOn) : new Date();
  const years = [initial.getFullYear() - 2, initial.getFullYear() - 1, initial.getFullYear()];
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [currency, setCurrency] = useState<Currency>(expense?.currency ?? "UGX");
  const [category, setCategory] = useState(expense?.category ?? "food");
  const [note, setNote] = useState(expense?.note ?? "");
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [day, setDay] = useState(initial.getDate());
  const [saving, setSaving] = useState(false);

  const maxDay = daysInMonth(`${year}-${String(month + 1).padStart(2, "0")}`);
  const safeDay = Math.min(day, maxDay);
  const spentOn = ymd(new Date(year, month, safeDay));
  const numeric = Number(amount);
  const valid = Number.isFinite(numeric) && numeric > 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = { amount: numeric, currency, category, note, spentOn };
      if (expense) {
        await api.patch(`/api/expenses/${expense.id}`, payload);
        gooeyToast.success("Expense updated", {
          description: `${formatAmount(numeric, currency)}, ${categoryOf(category).label}`,
        });
      } else {
        await api.post("/api/expenses", payload);
        gooeyToast.success("Expense logged", {
          description: `${formatAmount(numeric, currency)}, ${categoryOf(category).label}`,
        });
      }
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!expense) return;
    setSaving(true);
    try {
      await api.delete(`/api/expenses/${expense.id}`);
      gooeyToast.success("Expense deleted");
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not delete", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            {expense ? "Edit expense" : "Log an expense"}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {expense ? "Fix the details and save." : "Takes a few seconds."}
          </p>
        </div>
        <div className="flex rounded-full border border-border bg-muted p-0.5">
          {(["UGX", "USD"] as Currency[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setCurrency(code)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                currency === code ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-2 border-b border-border pb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {currency === "UGX" ? "UGX" : "USD"}
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

      <div className="flex flex-wrap gap-2">
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
      </div>

      <div>
        <p className="mb-2 text-[13px] text-muted-foreground">Category</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((option) => {
            const selected = option.id === category;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors",
                  selected
                    ? "border-primary/40 bg-primary/[0.06] text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  icon={option.icon}
                  className="size-4"
                  strokeWidth={selected ? 1.9 : 1.6}
                />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[13px] text-muted-foreground">When</p>
        <div className="flex items-center gap-1">
          <WheelPicker
            options={Array.from({ length: maxDay }, (_, index) => String(index + 1))}
            value={String(safeDay)}
            onValueChange={(value) => setDay(Number(value))}
            visibleCount={3}
            itemHeight={34}
            className="flex-1"
            aria-label="Day"
          />
          <WheelPicker
            options={MONTHS.map((label, index) => ({ label, value: String(index) }))}
            value={String(month)}
            onValueChange={(value) => setMonth(Number(value))}
            visibleCount={3}
            itemHeight={34}
            className="flex-1"
            aria-label="Month"
          />
          <WheelPicker
            options={years.map((value) => String(value))}
            value={String(year)}
            onValueChange={(value) => setYear(Number(value))}
            visibleCount={3}
            itemHeight={34}
            className="flex-1"
            aria-label="Year"
          />
        </div>
      </div>

      <Input label="Note" value={note} onChange={setNote} placeholder="What was it?" />

      <div className="flex items-center justify-between gap-2 pt-1">
        {expense ? (
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
          {expense ? "Save changes" : "Log it"}
        </Button>
      </div>
    </div>
  );
}
