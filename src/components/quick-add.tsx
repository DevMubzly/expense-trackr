"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { gooeyToast } from "goey-toast";
import { Cancel01Icon, SparklesIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { AccountSelect } from "@/components/account-select";
import { CategorySelect } from "@/components/category-select";
import { Checkbox } from "@/components/motion/checkbox";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { api as convexApi } from "../../convex/_generated/api";
import {
  toAccountInput,
  toCategoryInput,
} from "@/lib/convex-transactions";
import { useCategories } from "@/components/categories-provider";
import { formatNumber, parseNumericInput, parseYmd } from "@/lib/format";
import { parseQuickAdd, type QuickDraft } from "@/lib/quick-add";
import type { Account, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Received 900k salary, paid 250k rent, 15k transport, 30k groceries",
  "Boda 5k yesterday",
  "Freelance 300k",
];

export function QuickAddForm({
  accounts,
  settings,
  onSaved,
  onCancel,
}: {
  accounts: Account[];
  settings: Settings | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<QuickDraft[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { categoryOf } = useCategories();
  const createTransaction = useMutation(convexApi.transactions.create);

  const selectedDrafts = useMemo(
    () => drafts.filter((draft) => selected.includes(draft.id) && draft.amount > 0),
    [drafts, selected],
  );

  function runParse(value = text) {
    const parsed = parseQuickAdd(value, { accounts, settings });
    setDrafts(parsed);
    setSelected(parsed.filter((draft) => draft.amount > 0).map((draft) => draft.id));
  }

  function updateDraft(id: string, patch: Partial<QuickDraft>) {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((draftId) => draftId !== id),
    );
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
    setSelected((current) => current.filter((draftId) => draftId !== id));
  }

  async function commit() {
    if (!selectedDrafts.length || saving) return;
    setSaving(true);
    const spentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    try {
      await Promise.all(
        selectedDrafts.map((draft) => {
          const account = accounts.find(
            (entry) => entry.id === draft.accountId,
          );
          if (!account) {
            throw new Error("Pick an account for every draft.");
          }
          const destination = draft.toAccountId
            ? accounts.find((entry) => entry.id === draft.toAccountId)
            : undefined;
          return createTransaction({
            type: draft.type,
            amount: draft.amount,
            currency: draft.currency,
            account: toAccountInput(account),
            category:
              draft.type === "transfer"
                ? undefined
                : toCategoryInput(categoryOf(draft.category || "other")),
            toAccount:
              draft.type === "transfer" && destination
                ? toAccountInput(destination)
                : undefined,
            note: draft.note,
            spentOn: draft.spentOn,
            spentTime,
            source: "ai",
          });
        }),
      );
      gooeyToast.success(
        `${selectedDrafts.length} transaction${selectedDrafts.length === 1 ? "" : "s"} added`,
        {
          description: "Drafts were posted to your ledger.",
        },
      );
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not add transactions", {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Quick add</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Type it like you would text a friend. Review before anything is saved.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              runParse();
            }
          }}
          placeholder="Received 900k salary, paid 250k rent, 15k transport, 30k groceries..."
          className="min-h-24 w-full resize-none rounded-xl border border-border bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => runParse()} disabled={!text.trim()}>
            <Icon icon={SparklesIcon} className="size-4" /> Parse
          </Button>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setText(example);
                runParse(example);
              }}
              className="rounded-full border border-border px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {drafts.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{drafts.length} parsed</span>
            <span>{selectedDrafts.length} selected</span>
          </div>
          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {drafts.map((draft) => (
              <DraftRow
                key={draft.id}
                draft={draft}
                accounts={accounts}
                checked={selected.includes(draft.id)}
                onCheckedChange={(checked) => toggleSelected(draft.id, checked)}
                onChange={(patch) => updateDraft(draft.id, patch)}
                onRemove={() => removeDraft(draft.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          <Icon icon={Cancel01Icon} className="size-4" /> Cancel
        </Button>
        <Button onClick={commit} loading={saving} disabled={!selectedDrafts.length}>
          <Icon icon={Tick02Icon} className="size-4" />
          {saving
            ? "Adding"
            : `Add ${selectedDrafts.length || ""} transaction${selectedDrafts.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

function DraftRow({
  draft,
  accounts,
  checked,
  onCheckedChange,
  onChange,
  onRemove,
}: {
  draft: QuickDraft;
  accounts: Account[];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onChange: (patch: Partial<QuickDraft>) => void;
  onRemove: () => void;
}) {
  const { categoryOf } = useCategories();
  const kind = draft.type === "income" ? "income" : "expense";
  const typeLabel =
    draft.type === "expense" ? "Expense" : draft.type === "income" ? "Income" : "Transfer";

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        draft.needsReview ? "border-amber-500/40 bg-amber-500/[0.03]" : "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-label={`Include ${draft.note || typeLabel}`}
        />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            draft.type === "expense"
              ? "bg-muted text-muted-foreground"
              : draft.type === "income"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-sky-500/10 text-sky-700 dark:text-sky-300",
          )}
        >
          {typeLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {draft.note || typeLabel}
        </span>
        {draft.needsReview ? (
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Review
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove draft"
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Icon icon={Cancel01Icon} className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          value={draft.amount ? formatNumber(draft.amount) : ""}
          onChange={(event) =>
            onChange({ amount: parseNumericInput(event.target.value) })
          }
          inputMode="decimal"
          aria-label="Amount"
          className="tnum h-9 min-w-0 rounded-lg border border-border bg-transparent px-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          value={draft.note}
          onChange={(event) => onChange({ note: event.target.value })}
          aria-label="Description"
          className="h-9 min-w-0 rounded-lg border border-border bg-transparent px-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {draft.type !== "transfer" ? (
          <CategorySelect
            kind={kind}
            value={draft.category}
            onValueChange={(category) => onChange({ category })}
            compact
          />
        ) : (
          <AccountSelect
            label="From"
            value={draft.accountId}
            accounts={accounts}
            onValueChange={(accountId) => onChange({ accountId })}
          />
        )}
        {draft.type === "transfer" ? (
          <AccountSelect
            label="To"
            value={draft.toAccountId ?? ""}
            accounts={accounts}
            onValueChange={(toAccountId) => onChange({ toAccountId })}
          />
        ) : (
          <AccountSelect
            label="Account"
            value={draft.accountId}
            accounts={accounts}
            onValueChange={(accountId) => onChange({ accountId })}
            compact
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {draft.currency} ·{" "}
          {draft.type === "transfer"
            ? "Transfer"
            : categoryOf(draft.category || "other").label}
        </span>
        <input
          type="date"
          value={draft.spentOn}
          onChange={(event) => onChange({ spentOn: event.target.value })}
          aria-label="Date"
          className="h-8 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-[11px] text-muted-foreground outline-none focus-visible:border-foreground/50 focus-visible:ring-0"
        />
        <span className="sr-only">
          {parseYmd(draft.spentOn).toLocaleDateString("en-GB")}
        </span>
      </div>
    </div>
  );
}
