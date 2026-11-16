"use client";

import { useEffect, useMemo, useState } from "react";
import { gooeyToast } from "goey-toast";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  ArrowUp01Icon,
  Cancel01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { accountIcon } from "@/components/account-select";
import { Checkbox } from "@/components/motion/checkbox";
import { Input } from "@/components/motion/input";
import { Loader } from "@/components/motion/loader";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/motion/combobox";
import {
  DateRangePicker,
  DateRangePickerCalendar,
  DateRangePickerClear,
  DateRangePickerContent,
  DateRangePickerFooter,
  DateRangePickerGrid,
  DateRangePickerHeader,
  DateRangePickerSelection,
  DateRangePickerTrigger,
} from "@/components/motion/date-range-picker";
import type { DateRange } from "@/components/motion/date-range-picker";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { Panel, EmptyState } from "@/components/panel";
import { useTransactionDialog } from "@/components/expense-dialog";
import { useApi, api } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryOf,
} from "@/lib/categories";
import { formatNumber, parseYmd, relativeDay, ymd } from "@/lib/format";
import type { Account, Transaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type TypeFilter = "all" | TransactionType;
type SortKey = "spentOn" | "note" | "category" | "amountUgx";
type SortState = { key: SortKey; direction: "asc" | "desc" };

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfers" },
];

function expenseTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function typeLabel(type: TransactionType) {
  if (type === "expense") return "Expense";
  if (type === "income") return "Income";
  return "Transfer";
}

function typeClass(type: TransactionType) {
  if (type === "income") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (type === "transfer") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return "bg-muted text-muted-foreground";
}

export default function ExpensesPage() {
  const { version, openTransaction, openQuickAdd } = useTransactionDialog();
  const now = useNow();
  const today = now ? ymd(now) : "";

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [category, setCategory] = useState("all");
  const [account, setAccount] = useState("all");
  const [range, setRange] = useState<DateRange | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: "spentOn", direction: "desc" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedQuery(query);
      setPage(1);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [query]);

  const params = new URLSearchParams({ v: String(version) });
  if (appliedQuery) params.set("q", appliedQuery);
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (category !== "all") params.set("category", category);
  if (account !== "all") params.set("account", account);
  if (range?.from) params.set("from", range.from);
  if (range?.to) params.set("to", range.to);
  if (range?.from && !range.to) params.set("to", range.from);

  const { data, loading, refresh } = useApi<Transaction[]>(
    `/api/transactions?${params.toString()}`,
  );
  const { data: accountsData } = useApi<Account[]>(`/api/accounts?v=${version}`);
  const transactions = useMemo(() => data ?? [], [data]);
  const accounts = useMemo(() => accountsData ?? [], [accountsData]);
  const accountById = useMemo(
    () => new Map(accounts.map((entry) => [entry.id, entry])),
    [accounts],
  );

  const expenseTotal = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amountUgx, 0);
  const incomeTotal = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amountUgx, 0);
  const net = incomeTotal - expenseTotal;

  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;

    return [...transactions].sort((a, b) => {
      let result = 0;
      switch (sort.key) {
        case "note":
          result = (a.note || typeLabel(a.type)).localeCompare(
            b.note || typeLabel(b.type),
          );
          break;
        case "category":
          result = categoryOf(a.category || "other").label.localeCompare(
            categoryOf(b.category || "other").label,
          );
          break;
        case "amountUgx":
          result = a.amountUgx - b.amountUgx;
          break;
        case "spentOn":
        default:
          result =
            a.spentOn.localeCompare(b.spentOn) || a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return result * direction;
    });
  }, [sort, transactions]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [safePage, sortedRows],
  );
  const start = sortedRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, sortedRows.length);

  const pageIds = pageRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected = pageIds.some((id) => selected.includes(id));

  function resetPage() {
    setPage(1);
  }

  function changeType(value: TypeFilter) {
    setTypeFilter(value);
    if (
      value === "transfer" ||
      (value !== "all" && category !== "all" && categoryOf(category).kind !== value)
    ) {
      setCategory("all");
    }
    resetPage();
  }

  function togglePage(checked: boolean) {
    setSelected((current) => {
      if (checked) return Array.from(new Set([...current, ...pageIds]));
      const ids = new Set(pageIds);
      return current.filter((id) => !ids.has(id));
    });
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((selectedId) => selectedId !== id),
    );
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "spentOn" || key === "amountUgx" ? "desc" : "asc" },
    );
    resetPage();
  }

  async function deleteSelected() {
    if (!selected.length) return;
    await Promise.all(selected.map((id) => api.delete(`/api/transactions/${id}`)));
    gooeyToast.success(`${selected.length} transactions deleted`);
    setSelected([]);
    refresh();
  }

  const filtered =
    typeFilter !== "all" || account !== "all" || category !== "all" || Boolean(range || query);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-muted-foreground">Ledger</p>
          <h1 className="mt-2 font-display text-5xl leading-none">Every shilling.</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {transactions.length} entries,
            <Money value={net} size="sm" /> net
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 ? (
            <Button variant="destructive" onClick={deleteSelected}>
              <Icon icon={Delete02Icon} className="size-4" /> Delete {selected.length}
            </Button>
          ) : null}
          <Button variant="outline" onClick={openQuickAdd}>
            <Icon icon={SparklesIcon} className="size-4" /> Quick add
          </Button>
          <Button onClick={() => openTransaction(undefined, "expense")}>
            <Icon icon={PlusSignIcon} className="size-4" /> Add transaction
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full border border-border bg-muted p-0.5">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeType(option.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                typeFilter === option.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <Input
            value={query}
            onChange={setQuery}
            placeholder="Search notes, accounts and amounts"
            leftIcon={<Icon icon={Search01Icon} className="size-4" />}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {typeFilter !== "transfer" ? (
            <Combobox
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                resetPage();
              }}
              className="w-44 shrink-0"
            >
              <ComboboxTrigger className="h-11 min-w-0 rounded-xl px-3">
                <ComboboxInput
                  aria-label="Filter by category"
                  placeholder="Category"
                  showIcon={false}
                />
              </ComboboxTrigger>
              <ComboboxContent className="w-56 rounded-xl">
                <ComboboxList ariaLabel="Categories" className="p-2">
                  <ComboboxEmpty>No categories.</ComboboxEmpty>
                  <ComboboxItem value="all" textValue="All categories">
                    All categories
                  </ComboboxItem>
                  {typeFilter !== "income" ? (
                    <ComboboxGroup className="mt-1">
                      <ComboboxLabel>Expenses</ComboboxLabel>
                      {EXPENSE_CATEGORIES.map((option) => (
                        <ComboboxItem key={option.id} value={option.id} textValue={option.label}>
                          <span className="flex items-center gap-2">
                            <Icon icon={option.icon} className="size-4" /> {option.label}
                          </span>
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  ) : null}
                  {typeFilter !== "expense" ? (
                    <ComboboxGroup className="mt-1">
                      <ComboboxLabel>Income</ComboboxLabel>
                      {INCOME_CATEGORIES.map((option) => (
                        <ComboboxItem key={option.id} value={option.id} textValue={option.label}>
                          <span className="flex items-center gap-2">
                            <Icon icon={option.icon} className="size-4" /> {option.label}
                          </span>
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  ) : null}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          ) : null}

          <Combobox
            value={account}
            onValueChange={(value) => {
              setAccount(value);
              resetPage();
            }}
            className="w-40 shrink-0"
          >
            <ComboboxTrigger className="h-11 min-w-0 rounded-xl px-3">
              <ComboboxInput
                aria-label="Filter by account"
                placeholder="Account"
                showIcon={false}
              />
            </ComboboxTrigger>
            <ComboboxContent className="w-56 rounded-xl">
              <ComboboxList ariaLabel="Accounts" className="p-2">
                <ComboboxEmpty>No accounts.</ComboboxEmpty>
                <ComboboxItem value="all" textValue="All accounts">
                  All accounts
                </ComboboxItem>
                {accounts.map((option) => (
                  <ComboboxItem key={option.id} value={option.id} textValue={option.name}>
                    <span className="flex items-center gap-2">
                      <Icon icon={accountIcon(option.type)} className="size-4" />
                      {option.name}
                    </span>
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {today ? (
            <DateRangePicker
              value={range}
              onValueChange={(value) => {
                setRange(value);
                resetPage();
              }}
              max={today}
              defaultMonth={today}
              label="Date range"
              closeOnSelect
            >
              <DateRangePickerTrigger className="h-11" />
              <DateRangePickerContent>
                <DateRangePickerCalendar>
                  <DateRangePickerHeader />
                  <DateRangePickerGrid />
                  <DateRangePickerFooter>
                    <div className="flex items-center justify-between gap-2">
                      <DateRangePickerSelection />
                      <DateRangePickerClear />
                    </div>
                  </DateRangePickerFooter>
                </DateRangePickerCalendar>
              </DateRangePickerContent>
            </DateRangePicker>
          ) : null}

          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
                setCategory("all");
                setAccount("all");
                setRange(null);
                resetPage();
              }}
            >
              <Icon icon={Cancel01Icon} className="size-4" /> Clear
            </Button>
          ) : null}
        </div>
      </div>

      <Panel className="overflow-hidden">
        {loading && !data ? (
          <div className="flex justify-center py-20">
            <Loader variant="helix" size={26} />
          </div>
        ) : sortedRows.length === 0 ? (
          <EmptyState
            title="Nothing here"
            hint="No transactions match those filters. Loosen them, or add something new."
            action={
              <Button className="mt-2" onClick={() => openTransaction(undefined, "expense")}>
                <Icon icon={PlusSignIcon} className="size-4" /> Add transaction
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left">
                <caption className="sr-only">Transactions</caption>
                <thead>
                  <tr className="border-b border-border/70 bg-muted/20">
                    <th scope="col" className="w-12 px-4 py-3">
                      <Checkbox
                        checked={allPageSelected}
                        indeterminate={somePageSelected && !allPageSelected}
                        onCheckedChange={togglePage}
                        aria-label="Select all transactions on this page"
                      />
                    </th>
                    <th scope="col" className="w-40 px-4 py-3">
                      <SortHeading label="When" sortKey="spentOn" sort={sort} onToggle={toggleSort} />
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <SortHeading label="Description" sortKey="note" sort={sort} onToggle={toggleSort} />
                    </th>
                    <th scope="col" className="w-20 px-4 py-3">Type</th>
                    <th scope="col" className="w-32 px-4 py-3">
                      <SortHeading label="Category" sortKey="category" sort={sort} onToggle={toggleSort} />
                    </th>
                    <th scope="col" className="w-36 px-4 py-3">Account</th>
                    <th scope="col" className="w-32 px-4 py-3 text-right">
                      <SortHeading
                        label="Amount"
                        sortKey="amountUgx"
                        sort={sort}
                        onToggle={toggleSort}
                        align="right"
                      />
                    </th>
                    <th scope="col" className="w-20 px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {pageRows.map((row) => {
                    const cat = categoryOf(row.category || "other");
                    const spentOn = parseYmd(row.spentOn);
                    const source = accountById.get(row.accountId);
                    const destination = row.toAccountId
                      ? accountById.get(row.toAccountId)
                      : undefined;
                    const description =
                      row.note ||
                      (row.type === "transfer"
                        ? `Transfer${destination ? ` to ${destination.name}` : ""}`
                        : cat.label);
                    return (
                      <tr key={row.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selected.includes(row.id)}
                            onCheckedChange={(checked) => toggleRow(row.id, checked)}
                            aria-label={`Select ${description}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[13px]">{relativeDay(row.spentOn, today)}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {spentOn.toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              · {expenseTime(row.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openTransaction(row)}
                            className="flex items-center gap-2.5 text-left"
                          >
                            <span
                              className="grid size-8 shrink-0 place-items-center rounded-lg"
                              style={{
                                background: `color-mix(in oklab, ${cat.color} 14%, transparent)`,
                              }}
                            >
                              <Icon
                                icon={row.type === "transfer" ? ArrowLeftRightIcon : cat.icon}
                                className="size-4"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px]">{description}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {row.type === "transfer" ? "Movement between accounts" : cat.label}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                              typeClass(row.type),
                            )}
                          >
                            {typeLabel(row.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.type === "transfer" ? (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
                              style={{
                                background: `color-mix(in oklab, ${cat.color} 12%, transparent)`,
                              }}
                            >
                              <Icon icon={cat.icon} className="size-3.5" />
                              {cat.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-[12px]">
                            {source ? (
                              <Icon
                                icon={accountIcon(source.type)}
                                className="size-3.5 text-muted-foreground"
                              />
                            ) : null}
                            <span className="truncate">{source?.name ?? "Account"}</span>
                            {destination ? (
                              <>
                                <Icon icon={ArrowRight01Icon} className="size-3 text-muted-foreground" />
                                <span className="truncate">{destination.name}</span>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1">
                              {row.type !== "transfer" ? (
                                <span
                                  className={cn(
                                    "text-sm font-semibold",
                                    row.type === "income"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {row.type === "income" ? "+" : "−"}
                                </span>
                              ) : null}
                              <Money value={row.amountUgx} size="sm" />
                            </span>
                            {row.feeUgx ? (
                              <span className="text-[10px] text-muted-foreground">
                                + {formatNumber(row.feeUgx)} fee
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => openTransaction(row)}
                              aria-label={`Edit ${description}`}
                              className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Icon icon={PencilEdit01Icon} className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await api.delete(`/api/transactions/${row.id}`);
                                gooeyToast.success("Transaction deleted");
                                refresh();
                              }}
                              aria-label={`Delete ${description}`}
                              className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Icon icon={Delete02Icon} className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
              <p className="text-[11px] text-muted-foreground">
                Showing {start}–{end} of {sortedRows.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  aria-label="First page"
                >
                  <Icon icon={ArrowLeftDoubleIcon} className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                >
                  <Icon icon={ArrowLeft01Icon} className="size-4" />
                </Button>
                <span className="tnum px-2 text-[11px] text-muted-foreground">
                  {safePage} / {pageCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={safePage === pageCount}
                  aria-label="Next page"
                >
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPage(pageCount)}
                  disabled={safePage === pageCount}
                  aria-label="Last page"
                >
                  <Icon icon={ArrowRightDoubleIcon} className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>

      <p className="text-center text-[11px] text-muted-foreground">
        Select rows to delete in bulk. Click a description to edit it.
      </p>
    </div>
  );
}

function SortHeading({
  label,
  sortKey,
  sort,
  onToggle,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onToggle: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;

  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        align === "right" && "justify-end",
      )}
    >
      {label}
      <Icon
        icon={active && sort.direction === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
        className={cn("size-3", !active && "opacity-0")}
      />
    </button>
  );
}
