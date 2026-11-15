"use client";

import { useEffect, useMemo, useState } from "react";
import { gooeyToast } from "goey-toast";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
import { Panel, EmptyState } from "@/components/panel";
import { useExpenseDialog } from "@/components/expense-dialog";
import { useApi, api } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { formatUgx, parseYmd, relativeDay, ymd } from "@/lib/format";
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
            <span className="text-sm">{relativeDay(row.spentOn, today)}</span>
            <span className="text-[11px] text-muted-foreground">
              {parseYmd(row.spentOn).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
            <button type="button" onClick={() => openExpense(row)} className="flex items-center gap-2.5 text-left">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg text-sm"
                style={{ background: `color-mix(in oklab, ${cat.color} 16%, transparent)` }}
              >
                {cat.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm">{row.note || cat.label}</span>
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
              style={{ background: `color-mix(in oklab, ${cat.color} 14%, transparent)` }}
            >
              {cat.emoji} {cat.label}
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
        width: "160px",
        cell: (row) => (
          <span className="tnum text-sm">{formatUgx(row.amountUgx)}</span>
        ),
      },
      {
        key: "currency",
        header: "",
        width: "64px",
        align: "right",
        cell: (row) => (
          <ContextMenu>
            <ContextMenuTrigger>
              <button
                type="button"
                aria-label={`Actions for ${row.note || row.category}`}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
              >
                ⋯
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => openExpense(row)}>
                <Pencil className="size-3.5" /> Edit
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
                <Trash2 className="size-3.5" /> Delete
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
    gooeyToast.success(`${selected.length} expense${selected.length > 1 ? "s" : ""} deleted`);
    setSelected([]);
    refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Ledger</p>
          <h1 className="mt-1 font-display text-5xl leading-none">Every shilling.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {rows.length} entries · {formatUgx(total)} in view
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 ? (
            <Button variant="destructive" onClick={deleteSelected}>
              <Trash2 className="size-4" /> Delete {selected.length}
            </Button>
          ) : null}
          <Button onClick={() => openExpense()}>
            <Plus className="size-4" /> Add expense
          </Button>
        </div>
      </header>

      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1">
            <Input
              value={query}
              onChange={setQuery}
              placeholder="Search notes, amounts…"
              leftIcon={<Search className="size-4" />}
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
                      <span>{option.emoji}</span> {option.label}
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

          {range || category !== "all" || query ? (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setRange(null);
              }}
            >
              <X className="size-4" /> Clear
            </Button>
          ) : null}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        {rows.length === 0 && !loading ? (
          <EmptyState
            title="Nothing here"
            hint="No expenses match those filters. Loosen them up, or log something new."
            action={
              <Button className="mt-2" onClick={() => openExpense()}>
                <Plus className="size-4" /> Add expense
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
        Right-click a row handle for more actions. Click an expense name to edit it.
      </p>
    </div>
  );
}
