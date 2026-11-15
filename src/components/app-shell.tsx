"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChartPie,
  Command,
  FolderClosed,
  Home,
  Plus,
  Receipt,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Dock, DockItem, DockSeparator } from "@/components/motion/dock";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { DynamicIsland, DynamicIslandView } from "@/components/motion/dynamic-island";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { BloomMenu } from "@/components/motion/bloom-menu";
import { useExpenseDialog } from "@/components/expense-dialog";
import { useApi } from "@/lib/use-api";
import { formatNumber, formatUgxCompact } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/stats", label: "Insights", icon: ChartPie },
  { href: "/months", label: "Months", icon: FolderClosed },
  { href: "/convert", label: "Convert", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { version, openExpense } = useExpenseDialog();
  const { data: stats } = useApi<Stats>(`/api/stats?v=${version}`);
  const [commandOpen, setCommandOpen] = useState(false);
  const [islandView, setIslandView] = useState<string | null>(null);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "add",
        label: "Log an expense",
        group: "Actions",
        hint: "Add",
        icon: Plus,
        keywords: ["new", "add", "spend"],
        onSelect: () => openExpense(),
      },
      ...NAV.map((item) => ({
        id: item.href,
        label: item.label,
        group: "Go to",
        icon: item.icon,
        keywords: [item.href],
        onSelect: () => router.push(item.href),
      })),
      {
        id: "convert",
        label: "Convert UGX ⇄ USD",
        group: "Actions",
        icon: ArrowLeftRight,
        keywords: ["dollar", "rate", "exchange"],
        onSelect: () => router.push("/convert"),
      },
    ],
    [openExpense, router],
  );

  const today = stats?.totals.today ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="size-4" />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-xl leading-none">xpense</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">trackr</span>
            </span>
          </Link>

          <div className="ml-2 hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground lg:flex">
            <span className="size-1.5 rounded-full bg-primary" />
            {stats?.monthLabel ?? "Live"}
            <span className="text-border">/</span>
            <span className="text-foreground">{formatUgxCompact(stats?.totals.month ?? 0)}</span>
            <span className="text-border">/</span>
            <span>{stats?.totals.count ?? 0} entries</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIslandView(islandView ? null : "today")}
              className="cursor-pointer border-0 bg-transparent p-0"
              aria-label="Toggle today's summary"
            >
              <DynamicIsland
                view={islandView}
                compact={
                  <span className="flex items-center gap-2 whitespace-nowrap px-3 text-[11px] font-medium">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Today · {formatUgxCompact(today)}
                  </span>
                }
              >
                <DynamicIslandView id="today">
                  <div className="flex items-center gap-4 whitespace-nowrap px-4 py-2.5 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-background/60">Today</p>
                      <p className="tnum text-sm font-semibold">{formatNumber(today)}</p>
                    </div>
                    <div className="h-6 w-px bg-background/20" />
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-background/60">Left in budget</p>
                      <p className="tnum text-sm font-semibold">
                        {formatNumber(Math.max(0, (stats?.totals.budget ?? 0) - (stats?.totals.month ?? 0)))}
                      </p>
                    </div>
                  </div>
                </DynamicIslandView>
              </DynamicIsland>
            </button>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 text-xs text-muted-foreground",
                "transition-colors hover:border-border hover:text-foreground",
              )}
            >
              <Command className="size-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-border/70 px-1.5 py-0.5 text-[10px] md:inline">⌘K</kbd>
            </button>

            <ThemeToggle variant="circle-blur" className="size-9 rounded-full border border-border/70 bg-card/60" iconClassName="size-4" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-40 pt-8">{children}</main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-3">
        <Dock size={46} className="pointer-events-auto">
          {NAV.slice(0, 4).map((item) => {
            const active = pathname === item.href;
            return (
              <DockItem key={item.href} active={active} aria-label={item.label}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className="flex size-full items-center justify-center rounded-full"
                >
                  <item.icon className={cn("size-[18px] transition-colors", active ? "text-foreground" : "text-muted-foreground")} />
                </Link>
              </DockItem>
            );
          })}
          <DockSeparator />
          <DockItem active={pathname === "/convert"} aria-label="Convert">
            <Link href="/convert" aria-label="Convert" className="flex size-full items-center justify-center rounded-full">
              <ArrowLeftRight className="size-[18px] text-muted-foreground" />
            </Link>
          </DockItem>
          <DockItem active={pathname === "/settings"} aria-label="Settings">
            <Link href="/settings" aria-label="Settings" className="flex size-full items-center justify-center rounded-full">
              <Settings2 className="size-[18px] text-muted-foreground" />
            </Link>
          </DockItem>
        </Dock>
      </div>

      <div className="fixed bottom-24 right-6 z-50">
        <BloomMenu
          labels={{ create: "Quick add", close: "Close quick add" }}
          items={[
            { label: "Expense", icon: Receipt },
            { label: "Convert", icon: ArrowLeftRight },
            { label: "Insights", icon: ChartPie },
            { label: "Months", icon: FolderClosed },
          ]}
          onSelect={(label) => {
            if (label === "Expense") openExpense();
            if (label === "Convert") router.push("/convert");
            if (label === "Insights") router.push("/stats");
            if (label === "Months") router.push("/months");
          }}
        />
      </div>

      <CommandPalette items={commands} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
