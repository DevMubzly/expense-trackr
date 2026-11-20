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
} from "@hugeicons/core-free-icons";
import { accountIcon } from "@/components/account-select";
import { Checkbox } from "@/components/motion/checkbox";
import { Input } from "@/components/motion/input";
import {
  ExpensesTableSkeleton,
  PageReveal,
  Skeleton,
} from "@/components/skeletons";
import { MorphingModal } from "@/components/motion/morphing-modal";
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
import { EmptyState, Panel, PanelBody, sectionCardClass } from "@/components/panel";
import { useTransactionDialog } from "@/components/expense-dialog";
import { useApi, api } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { useCategories } from "@/components/categories-provider";
import { useCurrency } from "@/components/currency-provider";
import { addDays, formatNumber, parseYmd, relativeDay, ymd } from "@/lib/format";
import { PERIOD_OPTIONS } from "@/lib/periods";
import type {
  Account,
  StatPeriod,
  Transaction,
  TransactionType,
} from "@/lib/types";
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

function transactionTime(transaction: Transaction) {
  return transaction.spentTime || expenseTime(transaction.createdAt);
}

function shiftMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return shifted;
}

function periodWindow(
  period: StatPeriod,
  now: Date | null,
): { from?: string; to?: string } {
  if (!now || period === "all") return {};
  const to = ymd(now);
  switch (period) {
    case "today":
      return { from: to, to };
    case "7d":
      return { from: ymd(addDays(now, -6)), to };
    case "30d":
      return { from: ymd(addDays(now, -29)), to };
    case "90d":
      return { from: ymd(addDays(now, -89)), to };
    case "6m":
      return { from: ymd(shiftMonths(now, -6)), to };
    case "1y":
      return { from: ymd(shiftMonths(now, -12)), to };
    default:
      return {};
  }
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
  const { version, bumpVersion, openTransaction } = useTransactionDialog();
  const { expense: expenseCategories, income: incomeCategories, categoryOf } =
    useCategories();
  const display = useCurrency();
  const now = useNow();
  const today = now ? ymd(now) : "";

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState<StatPeriod>("all");
  const [range, setRange] = useState<DateRange | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    ids: string[];
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const periodRange = periodWindow(period, now);
  const rangeFrom = range?.from;
  const rangeTo = range?.to ?? range?.from;
  const fromCandidates = [periodRange.from, rangeFrom].filter(Boolean) as string[];
  const toCandidates = [periodRange.to, rangeTo].filter(Boolean) as string[];
  const from = fromCandidates.length
    ? fromCandidates.reduce((a, b) => (a > b ? a : b))
    : undefined;
  const to = toCandidates.length
    ? toCandidates.reduce((a, b) => (a < b ? a : b))
    : undefined;
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data, loading } = useApi<Transaction[]>(
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
            a.spentOn.localeCompare(b.spentOn) ||
            transactionTime(a).localeCompare(transactionTime(b)) ||
            a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return result * direction;
    });
  }, [categoryOf, sort, transactions]);

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

  async function deleteConfirmed() {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      await Promise.all(
        confirmDelete.ids.map((id) => api.delete(`/api/transactions/${id}`)),
      );
      const count = confirmDelete.ids.length;
      gooeyToast.success(
        `${count} transaction${count === 1 ? "" : "s"} deleted`,
        {
          description: "Your ledger totals have been updated.",
        },
      );
      setSelected((current) =>
        current.filter((id) => !confirmDelete.ids.includes(id)),
      );
      setConfirmDelete(null);
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not delete transactions", {
        description: (error as Error).message,
      });
    } finally {
      setDeleting(false);
    }
  }

  const filtered =
    typeFilter !== "all" ||
    category !== "all" ||
    period !== "all" ||
    Boolean(range || query);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl leading-none tracking-[-0.03em] md:text-3xl">Every shilling.</h1>
          {loading && !data ? (
            <Skeleton className="mt-3 h-3.5 w-52" />
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {formatNumber(transactions.length)}{" "}
              {transactions.length === 1 ? "entry" : "entries"},{" "}
              {display.formatMoney(net)} net
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 ? (
            <Button
              variant="destructive"
              onClick={() =>
                setConfirmDelete({
                  ids: selected,
                  label: `${selected.length} transactions`,
                })
              }
            >
              <Icon icon={Delete02Icon} className="size-4" /> Delete {selected.length}
            </Button>
          ) : null}
          <Button onClick={() => openTransaction(undefined, "expense")}>
            <Icon icon={PlusSignIcon} className="size-4" /> Add transaction
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <Input
            value={query}
            onChange={setQuery}
            placeholder="Search notes, accounts and amounts"
            leftIcon={<Icon icon={Search01Icon} className="size-4" />}
            classNames={{
              field:
                "h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent data-[state=focused]:ring-0",
              leftIcon: "left-0",
              input: "pl-7 text-sm",
            }}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Combobox
            value={typeFilter}
            onValueChange={(value) => changeType(value as TypeFilter)}
            className="w-28 shrink-0"
          >
            <ComboboxTrigger className="h-11 min-w-0 rounded-full px-3">
              <ComboboxInput
                aria-label="Filter by type"
                placeholder="Type"
                showIcon={false}
              />
            </ComboboxTrigger>
            <ComboboxContent className="w-44 rounded-2xl">
              <ComboboxList ariaLabel="Transaction type" className="p-2">
                <ComboboxEmpty>No transaction types.</ComboboxEmpty>
                {TYPE_OPTIONS.map((option) => (
                  <ComboboxItem key={option.value} value={option.value} textValue={option.label}>
                    {option.label}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {typeFilter !== "transfer" ? (
            <Combobox
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                resetPage();
              }}
              className="w-36 shrink-0"
            >
              <ComboboxTrigger className="h-11 min-w-0 rounded-full px-3">
                <ComboboxInput
                  aria-label="Filter by category"
                  placeholder="Category"
                  showIcon={false}
                />
              </ComboboxTrigger>
              <ComboboxContent className="w-72 rounded-2xl">
                <ComboboxList ariaLabel="Categories" className="p-2">
                  <ComboboxEmpty>No categories.</ComboboxEmpty>
                  <ComboboxItem value="all" textValue="All categories">
                    All categories
                  </ComboboxItem>
                  {typeFilter !== "income" ? (
                    <ComboboxGroup className="mt-1">
                      <ComboboxLabel>Expenses</ComboboxLabel>
                      {expenseCategories.map((option) => (
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
                      {incomeCategories.map((option) => (
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
            value={period}
            onValueChange={(value) => {
              setPeriod(value as StatPeriod);
              resetPage();
            }}
            className="w-32 shrink-0"
          >
            <ComboboxTrigger className="h-11 min-w-0 rounded-full px-3">
              <ComboboxInput
                aria-label="Filter by period"
                placeholder="All time"
                showIcon={false}
              />
            </ComboboxTrigger>
            <ComboboxContent className="w-44 rounded-2xl">
              <ComboboxList ariaLabel="Period" className="p-2">
                <ComboboxEmpty>No periods.</ComboboxEmpty>
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
                setPeriod("all");
                setRange(null);
                resetPage();
              }}
            >
              <Icon icon={Cancel01Icon} className="size-4" /> Clear
            </Button>
          ) : null}
        </div>
      </div>

      {loading && !data ? (
        <ExpensesTableSkeleton />
      ) : (
        <PageReveal>
          <Panel className={cn("overflow-hidden", sectionCardClass)}>
            <PanelBody className="overflow-hidden p-0">
              {sortedRows.length === 0 ? (
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
              <table className="w-full min-w-[992px] table-fixed border-collapse text-left">
                <caption className="sr-only">Transactions</caption>
                <colgroup>
                  <col className="w-12" />
                  <col className="w-36" />
                  <col className="w-60" />
                  <col className="w-24" />
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-20" />
                </colgroup>
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
                    <th scope="col" className="w-36 px-4 py-3">
                      <SortHeading label="When" sortKey="spentOn" sort={sort} onToggle={toggleSort} />
                    </th>
                    <th scope="col" className="w-60 px-4 py-3">
                      <SortHeading label="Description" sortKey="note" sort={sort} onToggle={toggleSort} />
                    </th>
                    <th scope="col" className="w-24 px-4 py-3">
                      <HeaderLabel>Type</HeaderLabel>
                    </th>
                    <th scope="col" className="w-32 px-4 py-3">
                      <SortHeading label="Category" sortKey="category" sort={sort} onToggle={toggleSort} />
                    </th>
                    <th scope="col" className="w-32 px-4 py-3">
                      <HeaderLabel>Account</HeaderLabel>
                    </th>
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
                      (row.type === "transfer" ? "Transfer" : cat.label);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => openTransaction(row)}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
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
                              · {transactionTime(row)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openTransaction(row);
                            }}
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
                              {row.type !== "transfer" ? (
                                <span className="block text-[11px] text-muted-foreground">
                                  {cat.label}
                                </span>
                              ) : null}
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
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px]"
                              style={{
                                background: `color-mix(in oklab, ${cat.color} 12%, transparent)`,
                              }}
                            >
                              {cat.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {destination ? (
                            <div className="flex flex-col gap-1 text-[12px]">
                              <span className="flex min-w-0 items-center gap-1.5">
                                {source ? (
                                  <Icon
                                    icon={accountIcon(source.type)}
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                  />
                                ) : null}
                                <span className="truncate">{source?.name ?? "Account"}</span>
                              </span>
                              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Icon
                                  icon={ArrowRight01Icon}
                                  className="size-3 shrink-0"
                                />
                                <span className="truncate">{destination.name}</span>
                              </span>
                            </div>
                          ) : (
                            <div className="flex min-w-0 items-center gap-1.5 text-[12px]">
                              {source ? (
                                <Icon
                                  icon={accountIcon(source.type)}
                                  className="size-3.5 shrink-0 text-muted-foreground"
                                />
                              ) : null}
                              <span className="truncate">{source?.name ?? "Account"}</span>
                            </div>
                          )}
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
                                + {display.formatValue(row.feeUgx)}{" "}
                                {display.unit} fee
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
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
                              onClick={() =>
                                setConfirmDelete({ ids: [row.id], label: description })
                              }
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
                Showing {formatNumber(start)}–{formatNumber(end)} of{" "}
                {formatNumber(sortedRows.length)}
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
        </PanelBody>
          </Panel>
        </PageReveal>
      )}

      <MorphingModal
        viewId={confirmDelete ? "confirm-delete" : null}
        onClose={() => {
          if (!deleting) setConfirmDelete(null);
        }}
        placement="center"
        className="max-w-sm"
        ariaLabel="Confirm delete"
      >
        {confirmDelete ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                {confirmDelete.ids.length > 1
                  ? `Delete ${confirmDelete.ids.length} transactions?`
                  : "Delete this transaction?"}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {confirmDelete.ids.length > 1
                  ? `${confirmDelete.label} will be permanently removed.`
                  : `“${confirmDelete.label}” will be permanently removed.`}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteConfirmed}
                loading={deleting}
              >
                <Icon icon={Delete02Icon} className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </MorphingModal>
    </div>
  );
}

function HeaderLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
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
