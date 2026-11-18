"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRightIcon,
  ChartLineData01Icon,
  Folder01Icon,
  Home01Icon,
  Money01Icon,
  PieChartIcon,
  PlusSignIcon,
  ReceiptTextIcon,
  Search01Icon,
  Settings01Icon,
  SparklesIcon,
  Target02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { Dock, DockItem, DockSeparator } from "@/components/motion/dock";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { DynamicIsland, DynamicIslandView } from "@/components/motion/dynamic-island";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { BloomMenu } from "@/components/motion/bloom-menu";
import { useTransactionDialog } from "@/components/expense-dialog";
import { Icon } from "@/components/huge-icon";
import { useApi } from "@/lib/use-api";
import { formatNumber } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

const FRAME =
  "mx-auto w-full max-w-[1200px] px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home01Icon },
  { href: "/expenses", label: "Ledger", icon: ReceiptTextIcon },
  { href: "/stats", label: "Insights", icon: ChartLineData01Icon },
  { href: "/plan", label: "Plan", icon: Target02Icon },
  { href: "/assistant", label: "Assistant", icon: SparklesIcon },
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
  { label: "Income", icon: glyph(Money01Icon) },
  { label: "Transfer", icon: glyph(ArrowLeftRightIcon) },
  { label: "Plan", icon: glyph(Target02Icon) },
  { label: "Assistant", icon: glyph(SparklesIcon) },
  { label: "Insights", icon: glyph(PieChartIcon) },
  { label: "Months", icon: glyph(Folder01Icon) },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { version, openTransaction } = useTransactionDialog();
  const { data: stats } = useApi<Stats>(`/api/stats?v=${version}`);
  const [commandOpen, setCommandOpen] = useState(false);
  const [islandView, setIslandView] = useState<string | null>(null);
  const islandRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!islandView) return;
    const onPointerDown = (event: PointerEvent) => {
      if (islandRef.current?.contains(event.target as Node)) return;
      setIslandView(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIslandView(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [islandView]);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "add-expense",
        label: "Add an expense",
        group: "Actions",
        hint: "Expense",
        icon: PlusSignIcon,
        keywords: ["new", "add", "spend", "expense"],
        onSelect: () => openTransaction(undefined, "expense"),
      },
      {
        id: "add-income",
        label: "Add income",
        group: "Actions",
        hint: "Income",
        icon: Money01Icon,
        keywords: ["salary", "freelance", "forex", "earn"],
        onSelect: () => openTransaction(undefined, "income"),
      },
      {
        id: "add-transfer",
        label: "Transfer money",
        group: "Actions",
        hint: "Transfer",
        icon: ArrowLeftRightIcon,
        keywords: ["move", "momo", "bank", "cash"],
        onSelect: () => openTransaction(undefined, "transfer"),
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
    [openTransaction, router],
  );

  const today = stats?.totals.todayNet ?? 0;
  const remaining = Math.max(0, (stats?.totals.budget ?? 0) - (stats?.totals.month ?? 0));

  return (
    <div className="flex min-h-dvh flex-col">
      <main className={cn("flex-1 pb-40 pt-10", FRAME)}>{children}</main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-3">
        <button
          ref={islandRef}
          type="button"
          onClick={() => setIslandView(islandView ? null : "today")}
          className="pointer-events-auto cursor-pointer border-0 bg-transparent p-0"
          aria-label="Today's summary"
          aria-expanded={islandView === "today"}
        >
          <DynamicIsland
            view={islandView}
            compact={
              <span className="flex items-center gap-2 whitespace-nowrap px-3 text-[11px] font-medium">
                Today net
                <span className="text-background/50">·</span>
                <span className="text-background/60">UGX</span>
                {formatNumber(today)}
              </span>
            }
          >
            <DynamicIslandView id="today">
              <div className="flex items-center gap-5 whitespace-nowrap px-4 py-2.5">
                <div>
                  <p className="text-[10px] text-background/60">Today net</p>
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

        <Dock
          size={46}
          className="pointer-events-auto max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar"
        >
          {NAV.slice(0, 4).map((item) => {
            const active = pathname === item.href;
            return (
              <DockItem key={item.href} active={active} aria-label={item.label}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className="flex size-full items-center justify-center rounded-md"
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
                  className="flex size-full items-center justify-center rounded-md"
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
          <DockItem onClick={() => setCommandOpen(true)} aria-label="Search">
            <Icon icon={Search01Icon} className="size-[18px] text-muted-foreground" />
          </DockItem>
          <DockItem aria-label="Toggle theme">
            <ThemeToggle
              variant="circle-blur"
              className="size-9 rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              iconClassName="size-[18px]"
            />
          </DockItem>
        </Dock>
      </div>

      <div className="fixed bottom-24 right-6 z-50">
        <BloomMenu
          items={MENU_ITEMS}
          labels={{ create: "Actions", close: "Close menu" }}
          onSelect={(label) => {
            if (label === "Expense") openTransaction(undefined, "expense");
            if (label === "Income") openTransaction(undefined, "income");
            if (label === "Transfer") openTransaction(undefined, "transfer");
            if (label === "Plan") router.push("/plan");
            if (label === "Assistant") router.push("/assistant");
            if (label === "Insights") router.push("/stats");
            if (label === "Months") router.push("/months");
          }}
        />
      </div>

      <CommandPalette items={commands} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
