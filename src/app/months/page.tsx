"use client";

import { CreditCardIcon, Folder01Icon } from "@hugeicons/core-free-icons";
import { ProjectFolder } from "@/components/motion/project-folder";
import { CardFolder } from "@/components/motion/card-folder";
import { Loader } from "@/components/motion/loader";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { Panel, PanelHeader } from "@/components/panel";
import { useApi } from "@/lib/use-api";
import { categoryOf } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import type { MonthSummary } from "@/lib/types";

export default function MonthsPage() {
  const { data, loading } = useApi<MonthSummary[]>("/api/months");

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader variant="dither" size={30} />
      </div>
    );
  }

  const months = data ?? [];
  const [current, ...rest] = months;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-5xl leading-none md:text-[56px]">
          A folder for every month.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Open a month to fan out its biggest expenses. Your current month sits in the card
          sleeve.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <Panel className="col-span-12 p-6 lg:col-span-8">
          <PanelHeader
            title="Months"
            hint="Hover to preview, click to expand"
            className="p-0 pb-8"
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
            {months.map((month) => (
              <div key={month.month} className="flex justify-center">
                <ProjectFolder
                  title={month.label}
                  description={`${formatNumber(month.total)} UGX`}
                  labels={{ countOne: "{count} entry", countOther: "{count} entries" }}
                  previews={month.top.map((expense) => {
                    const category = categoryOf(expense.category);
                    return {
                      id: expense.id,
                      content: (
                        <div className="flex h-24 w-16 flex-col justify-between rounded-lg border border-border bg-card p-2 text-[9px] shadow-sm">
                          <Icon icon={category.icon} className="size-4 text-muted-foreground" />
                          <span className="tnum font-medium">{formatNumber(expense.amountUgx)}</span>
                          <span className="truncate text-muted-foreground">
                            {expense.note || category.label}
                          </span>
                        </div>
                      ),
                    };
                  })}
                />
              </div>
            ))}
          </div>
        </Panel>

        <div className="col-span-12 space-y-5 lg:col-span-4">
          <Panel className="p-6">
            <PanelHeader title="Current month" hint="Your spending card" className="p-0 pb-4" />
            {current ? (
              <div className="flex justify-center">
                <CardFolder
                  title={current.label}
                  defaultOpen
                  cardNumber={`UGX ${formatNumber(current.total)}`}
                  expiry={current.shortLabel}
                  cvv={`${current.count} entries`}
                  actionLabel="Open month"
                  card={
                    <div className="flex h-40 w-full flex-col justify-between rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/75 p-4 text-primary-foreground shadow-xl">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-semibold tracking-[-0.02em]">Expense Trackr</span>
                        <Icon icon={CreditCardIcon} className="size-5 opacity-70" />
                      </div>
                      <div>
                        <p className="text-[10px] opacity-70">Spent in {current.shortLabel}</p>
                        <p className="tnum mt-0.5 text-2xl font-semibold">
                          {formatNumber(current.total)} UGX
                        </p>
                      </div>
                    </div>
                  }
                  labels={{ showDetails: "Show month details", hideDetails: "Hide month details" }}
                />
              </div>
            ) : null}
            {current ? (
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">Income</p>
                  <Money value={current.income} size="sm" className="mt-1" />
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Net</p>
                  <Money value={current.net} size="sm" className="mt-1" />
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel className="p-6">
            <PanelHeader title="Biggest this month" hint="The ones that stung" className="p-0 pb-4" />
            <ul className="space-y-3">
              {(current?.top ?? []).map((expense) => {
                const category = categoryOf(expense.category);
                return (
                  <li key={expense.id} className="flex items-center gap-2.5 text-[13px]">
                    <span
                      className="grid size-8 place-items-center rounded-lg"
                      style={{ background: `color-mix(in oklab, ${category.color} 14%, transparent)` }}
                    >
                      <Icon icon={category.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {expense.note || category.label}
                    </span>
                    <Money value={expense.amountUgx} size="sm" />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="p-6">
        <PanelHeader
          title="Earlier months"
          hint={`${rest.length} months in the archive`}
          className="p-0 pb-4"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {rest.map((month) => (
            <div
              key={month.month}
              className="flex items-center gap-3 rounded-xl border border-border/70 p-3"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon icon={Folder01Icon} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">{month.label}</p>
                <p className="text-[11px] text-muted-foreground">{month.count} entries</p>
              </div>
              <Money value={month.total} size="sm" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
