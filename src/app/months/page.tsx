"use client";

import { CreditCard, FolderClosed } from "lucide-react";
import { ProjectFolder } from "@/components/motion/project-folder";
import { CardFolder } from "@/components/motion/card-folder";
import { Loader } from "@/components/motion/loader";
import { Panel, PanelHeader } from "@/components/panel";
import { useApi } from "@/lib/use-api";
import { categoryOf } from "@/lib/categories";
import { formatUgx, formatUgxCompact, relativeDay, ymd } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import type { Expense } from "@/lib/types";

type MonthSummary = {
  month: string;
  label: string;
  shortLabel: string;
  total: number;
  count: number;
  top: Expense[];
};

export default function MonthsPage() {
  const { data, loading } = useApi<MonthSummary[]>("/api/months");
  const now = useNow();
  const today = now ? ymd(now) : "";

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader variant="dither" size={32} />
      </div>
    );
  }

  const months = data ?? [];
  const [current, ...rest] = months;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Archive</p>
        <h1 className="mt-1 font-display text-5xl leading-none md:text-6xl">A folder for every month.</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Open a month to see the receipts fanned out. The card sits in its sleeve on the right.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <Panel className="col-span-12 p-5 lg:col-span-8">
          <PanelHeader title="Months" hint="Hover to fan the biggest expenses, click to expand" className="p-0 pb-6" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {months.map((month) => (
              <div key={month.month} className="flex justify-center">
                <ProjectFolder
                  title={month.label}
                  description={`${formatUgxCompact(month.total)} across ${month.count} entries`}
                  itemLabel="entry"
                  previews={month.top.map((expense) => {
                    const category = categoryOf(expense.category);
                    return {
                      id: expense.id,
                      content: (
                        <div className="flex h-24 w-16 flex-col justify-between rounded-lg border border-border bg-card p-2 text-[9px] shadow-sm">
                          <span className="text-base leading-none">{category.emoji}</span>
                          <span className="tnum font-medium">{formatUgxCompact(expense.amountUgx)}</span>
                          <span className="truncate text-muted-foreground">{expense.note || category.label}</span>
                        </div>
                      ),
                    };
                  })}
                />
              </div>
            ))}
          </div>
        </Panel>

        <div className="col-span-12 space-y-4 lg:col-span-4">
          <Panel className="p-5">
            <PanelHeader title="Current month" hint="Your spending card" className="p-0 pb-4" />
            {current ? (
              <div className="flex justify-center">
                <CardFolder
                  title={current.label}
                  defaultOpen
                  cardNumber={`UGX ${formatUgx(current.total).replace("UGX ", "")}`}
                  expiry={current.shortLabel}
                  cvv={`${current.count} entries`}
                  actionLabel="Open month"
                  card={
                    <div className="flex h-40 w-full flex-col justify-between rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 p-4 text-primary-foreground shadow-xl">
                      <div className="flex items-start justify-between">
                        <span className="font-display text-lg leading-none">xpense</span>
                        <CreditCard className="size-5 opacity-80" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">Spent in {current.shortLabel}</p>
                        <p className="tnum font-display text-2xl leading-tight">{formatUgx(current.total)}</p>
                      </div>
                    </div>
                  }
                  labels={{ showDetails: "Show month details", hideDetails: "Hide month details" }}
                />
              </div>
            ) : null}
          </Panel>

          <Panel className="p-5">
            <PanelHeader title="Biggest this month" hint="The ones that stung" className="p-0 pb-3" />
            <ul className="space-y-2">
              {(current?.top ?? []).map((expense) => {
                const category = categoryOf(expense.category);
                return (
                  <li key={expense.id} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="grid size-8 place-items-center rounded-lg text-sm"
                      style={{ background: `color-mix(in oklab, ${category.color} 16%, transparent)` }}
                    >
                      {category.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {expense.note || category.label}
                    </span>
                    <span className="tnum text-xs">{formatUgxCompact(expense.amountUgx)}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="p-5">
        <PanelHeader title="Older months" hint={`${rest.length} earlier months in the archive`} className="p-0 pb-4" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {rest.map((month) => (
            <div key={month.month} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/40 p-3">
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <FolderClosed className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{month.label}</p>
                <p className="text-[11px] text-muted-foreground">{month.count} entries</p>
              </div>
              <span className="tnum text-xs">{formatUgxCompact(month.total)}</span>
            </div>
          ))}
        </div>
      </Panel>

      <p className="text-center text-[11px] text-muted-foreground">
        {today ? `Archive as of ${relativeDay(today, today)}` : "Archive"} · folders open on click
      </p>
    </div>
  );
}
