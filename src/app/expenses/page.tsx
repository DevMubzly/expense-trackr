"use client";

import { useEffect, useMemo, useState } from "react";
import { gooeyToast } from "goey-toast";
import {
  Cancel01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { Table, type TableColumn } from "@/components/motion/table";
import { Input } from "@/components/motion/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/motion/context-menu";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { Panel, EmptyState } from "@/components/panel";
import { useExpenseDialog } from "@/components/expense-dialog";
import { useApi, api } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { parseYmd, relativeDay, ymd } from "@/lib/format";
import type { Expense } from "@/lib/types";

export default function ExpensesPage() {
  const { version, openExpense } = useExpenseDialog();
  const now = useNow();
  const today = now ? ymd(now) : "";

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState<DateRange | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query), 260);
    return () => window.clearTimeout(timer);
  }, [query]);

  const params = new URLSearchParams({ v: String(version) });
  if (appliedQuery) params.set("q", appliedQuery);
  if (category !== "all") params.set("category", category);
  if (range?.from) params.set("from", range.from);
  if (range?.to) params.set("to", range.to);
  if (range?.from && !range.to) params.set("to", range.from);

  const { data, loading, refresh } = useApi<Expense[]>(`/api/expenses?${params.toString()}`);
  const rows = data ?? [];
  const total = rows.reduce((sum, row) => sum + row.amountUgx, 0);

  const columns = useMemo<TableColumn<Expense>[]>(
    () => [
      {
        key: "spentOn",
        header: "When",
        sortable: true,
        width: "170px",
        cell: (row) => (
          <div className="flex flex-col">
            <span className="text-[13px]">{relativeDay(row.spentOn, today)}</span>
            <span className="text-[11px] text-muted-foreground">
              {parseYmd(row.spentOn).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        ),
      },
      {
        key: "note",
        header: "Expense",
        sortable: true,
        width: "2fr",
        cell: (row) => {
          const cat = categoryOf(row.category);
          return (
            <button
              type="button"
              onClick={() => openExpense(row)}
              className="flex items-center gap-2.5 text-left"
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg"
                style={{ background: `color-mix(in oklab, ${cat.color} 14%, transparent)` }}
              >
                <Icon icon={cat.icon} className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px]">{row.note || cat.label}</span>
                <span className="block text-[11px] text-muted-foreground">{cat.label}</span>
              </span>
            </button>
          );
        },
        sortValue: (row) => row.note,
      },
      {
        key: "category",
        header: "Category",
        sortable: true,
        width: "150px",
        cell: (row) => {
          const cat = categoryOf(row.category);
          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
              style={{ background: `color-mix(in oklab, ${cat.color} 12%, transparent)` }}
            >
              <Icon icon={cat.icon} className="size-3.5" />
              {cat.label}
            </span>
          );
        },
        sortValue: (row) => categoryOf(row.category).label,
      },
      {
        key: "amountUgx",
        header: "Amount",
        sortable: true,
        align: "right",
        width: "170px",
        cell: (row) => <Money value={row.amountUgx} size="sm" />,
      },
      {
        key: "currency",
        header: "",
        width: "56px",
        align: "right",
        cell: (row) => (
          <ContextMenu>
            <ContextMenuTrigger>
              <button
                type="button"
                aria-label={`Actions for ${row.note || row.category}`}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon icon={PencilEdit01Icon} className="size-3.5" />
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => openExpense(row)}>
                <Icon icon={PencilEdit01Icon} className="size-3.5" /> Edit
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                tone="destructive"
                onSelect={async () => {
                  await api.delete(`/api/expenses/${row.id}`);
                  gooeyToast.success("Expense deleted");
                  refresh();
                }}
              >
                <Icon icon={Delete02Icon} className="size-3.5" /> Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ),
      },
    ],
    [openExpense, refresh, today],
  );

  async function deleteSelected() {
    if (!selected.length) return;
    await Promise.all(selected.map((id) => api.delete(`/api/expenses/${id}`)));
    gooeyToast.success(`${selected.length} expenses deleted`);
    setSelected([]);
    refresh();
  }

  const filtered = Boolean(range || category !== "all" || query);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-muted-foreground">Ledger</p>
          <h1 className="mt-2 font-display text-5xl leading-none">Every shilling.</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            {rows.length} entries, <Money value={total} size="sm" /> in view
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 ? (
            <Button variant="destructive" onClick={deleteSelected}>
              <Icon icon={Delete02Icon} className="size-4" /> Delete {selected.length}
            </Button>
          ) : null}
          <Button onClick={() => openExpense()}>
            <Icon icon={PlusSignIcon} className="size-4" /> Add expense
          </Button>
        </div>
      </header>

      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1">
            <Input
              value={query}
              onChange={setQuery}
              placeholder="Search notes and amounts"
              leftIcon={<Icon icon={Search01Icon} className="size-4" />}
            />
          </div>

          <Combobox value={category} onValueChange={setCategory}>
            <ComboboxTrigger className="h-11 w-44 rounded-xl px-3">
              <ComboboxInput aria-label="Filter by category" placeholder="Category" />
            </ComboboxTrigger>
            <ComboboxContent className="w-56 rounded-xl">
              <ComboboxList ariaLabel="Categories" className="p-2">
                <ComboboxEmpty>No categories.</ComboboxEmpty>
                <ComboboxItem value="all" textValue="All categories">
                  All categories
                </ComboboxItem>
                {CATEGORIES.map((option) => (
                  <ComboboxItem key={option.id} value={option.id} textValue={option.label}>
                    <span className="flex items-center gap-2">
                      <Icon icon={option.icon} className="size-4" /> {option.label}
                    </span>
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {today ? (
            <DateRangePicker
              value={range}
              onValueChange={setRange}
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
                setCategory("all");
                setRange(null);
              }}
            >
              <Icon icon={Cancel01Icon} className="size-4" /> Clear
            </Button>
          ) : null}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        {rows.length === 0 && !loading ? (
          <EmptyState
            title="Nothing here"
            hint="No expenses match those filters. Loosen them, or log something new."
            action={
              <Button className="mt-2" onClick={() => openExpense()}>
                <Icon icon={PlusSignIcon} className="size-4" /> Add expense
              </Button>
            }
          />
        ) : (
          <Table
            data={rows}
            columns={columns}
            getRowId={(row) => row.id}
            selectable
            selectedRowIds={selected}
            onSelectionChange={setSelected}
            defaultSort={{ key: "spentOn", direction: "desc" }}
            rowHeight={56}
            height={620}
            loading={loading}
            className="rounded-2xl border-0"
            onDeleteRow={async (rowId) => {
              await api.delete(`/api/expenses/${rowId}`);
              gooeyToast.success("Expense deleted");
              refresh();
            }}
          />
        )}
      </Panel>

      <p className="text-center text-[11px] text-muted-foreground">
        Select rows to delete in bulk. Click an expense name to edit it.
      </p>
    </div>
  );
}
