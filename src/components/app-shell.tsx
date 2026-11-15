"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeftRightIcon,
  ChartLineData01Icon,
  CommandIcon,
  Folder01Icon,
  Home01Icon,
  PieChartIcon,
  PlusSignIcon,
  ReceiptTextIcon,
  Search01Icon,
  Settings01Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { Dock, DockItem, DockSeparator } from "@/components/motion/dock";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { DynamicIsland, DynamicIslandView } from "@/components/motion/dynamic-island";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { BloomMenu } from "@/components/motion/bloom-menu";
import { useExpenseDialog } from "@/components/expense-dialog";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { useApi } from "@/lib/use-api";
import { formatNumber } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home01Icon },
  { href: "/expenses", label: "Expenses", icon: ReceiptTextIcon },
  { href: "/stats", label: "Insights", icon: ChartLineData01Icon },
  { href: "/months", label: "Months", icon: Folder01Icon },
  { href: "/convert", label: "Convert", icon: ArrowLeftRightIcon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
];

function glyph(icon: IconSvgElement) {
  return function Glyph({ className }: { className?: string }) {
    return <Icon icon={icon} className={className} />;
  };
}

const MENU_ITEMS = [
  { label: "Expense", icon: glyph(ReceiptTextIcon) },
  { label: "Convert", icon: glyph(ArrowLeftRightIcon) },
  { label: "Insights", icon: glyph(PieChartIcon) },
  { label: "Months", icon: glyph(Folder01Icon) },
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
        icon: PlusSignIcon,
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
        label: "Convert UGX to USD",
        group: "Actions",
        icon: ArrowLeftRightIcon,
        keywords: ["dollar", "rate", "exchange"],
        onSelect: () => router.push("/convert"),
      },
    ],
    [openExpense, router],
  );

  const today = stats?.totals.today ?? 0;
  const remaining = Math.max(0, (stats?.totals.budget ?? 0) - (stats?.totals.month ?? 0));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Icon icon={Wallet02Icon} className="size-[18px]" strokeWidth={1.7} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Expense Trackr</span>
          </Link>

          <div className="ml-2 hidden items-center gap-2.5 text-[13px] text-muted-foreground lg:flex">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-foreground">{stats?.monthLabel ?? "This month"}</span>
            <span className="text-border">·</span>
            <Money value={stats?.totals.month ?? 0} size="sm" />
            <span className="text-border">·</span>
            <span>{stats?.totals.count ?? 0} entries</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIslandView(islandView ? null : "today")}
              className="cursor-pointer border-0 bg-transparent p-0"
              aria-label="Today's summary"
            >
              <DynamicIsland
                view={islandView}
                compact={
                  <span className="flex items-center gap-2 whitespace-nowrap px-3 text-[11px] font-medium">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Today
                    <span className="text-background/50">·</span>
                    <span className="text-background/60">UGX</span>
                    {formatNumber(today)}
                  </span>
                }
              >
                <DynamicIslandView id="today">
                  <div className="flex items-center gap-5 whitespace-nowrap px-4 py-2.5">
                    <div>
                      <p className="text-[10px] text-background/60">Today</p>
                      <p className="tnum text-sm font-semibold">
                        <span className="mr-1 text-[10px] font-normal text-background/60">UGX</span>
                        {formatNumber(today)}
                      </p>
                    </div>
                    <div className="h-6 w-px bg-background/20" />
                    <div>
                      <p className="text-[10px] text-background/60">Left in budget</p>
                      <p className="tnum text-sm font-semibold">
                        <span className="mr-1 text-[10px] font-normal text-background/60">UGX</span>
                        {formatNumber(remaining)}
                      </p>
                    </div>
                  </div>
                </DynamicIslandView>
              </DynamicIsland>
            </button>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon icon={Search01Icon} className="size-4" />
              <span className="hidden sm:inline">Search</span>
              <span className="hidden items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] md:flex">
                <Icon icon={CommandIcon} className="size-2.5" />K
              </span>
            </button>

            <ThemeToggle
              variant="circle-blur"
              className="size-9 rounded-full border border-border bg-card"
              iconClassName="size-4"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-40 pt-10">{children}</main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
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
                  <Icon
                    icon={item.icon}
                    className={cn("size-[18px]", active ? "text-foreground" : "text-muted-foreground")}
                  />
                </Link>
              </DockItem>
            );
          })}
          <DockSeparator />
          {NAV.slice(4).map((item) => {
            const active = pathname === item.href;
            return (
              <DockItem key={item.href} active={active} aria-label={item.label}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className="flex size-full items-center justify-center rounded-full"
                >
                  <Icon
                    icon={item.icon}
                    className={cn("size-[18px]", active ? "text-foreground" : "text-muted-foreground")}
                  />
                </Link>
              </DockItem>
            );
          })}
        </Dock>
      </div>

      <div className="fixed bottom-24 right-6 z-50">
        <BloomMenu
          items={MENU_ITEMS}
          labels={{ create: "Quick add", close: "Close quick add" }}
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
