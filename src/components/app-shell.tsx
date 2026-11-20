"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftRightIcon,
  ChartLineData01Icon,
  Home01Icon,
  Money01Icon,
  PlusSignIcon,
  ReceiptTextIcon,
  Search01Icon,
  Settings01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons";
import { Dock, DockItem, DockSeparator } from "@/components/motion/dock";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { DynamicIsland, DynamicIslandView } from "@/components/motion/dynamic-island";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { useCurrency } from "@/components/currency-provider";
import { useAuth } from "@/components/auth-provider";
import { useTransactionDialog } from "@/components/expense-dialog";
import { Icon } from "@/components/huge-icon";
import { useApi } from "@/lib/use-api";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

const FRAME =
  "mx-auto w-full max-w-[1200px] px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home01Icon },
  { href: "/expenses", label: "Expenses", icon: ReceiptTextIcon },
  { href: "/stats", label: "Insights", icon: ChartLineData01Icon },
  { href: "/plan", label: "Plan", icon: Target02Icon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
];

function IslandSkeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block overflow-hidden rounded-full bg-white/15",
        className,
      )}
    >
      <span className="skeleton-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </span>
  );
}

function SessionGateSkeleton() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="skeleton-shimmer relative size-12 overflow-hidden rounded-2xl bg-muted/40" />
        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted/40">
          <span className="skeleton-shimmer block h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </div>
        <span className="sr-only">Checking your session</span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const publicRoute = pathname === "/" || pathname === "/login" || pathname === "/pricing";
  const { version, openTransaction } = useTransactionDialog();
  const display = useCurrency();
  const { data: stats, loading: statsLoading } = useApi<Stats>(
    publicRoute ? null : `/api/stats?v=${version}`,
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [islandView, setIslandView] = useState<string | null>(null);
  const [navTip, setNavTip] = useState<{ label: string; x: number } | null>(
    null,
  );
  const islandRef = useRef<HTMLButtonElement>(null);
  const navTipTimer = useRef<number | null>(null);

  function showNavTip(label: string, element: HTMLElement) {
    if (navTipTimer.current) {
      window.clearTimeout(navTipTimer.current);
      navTipTimer.current = null;
    }
    const rect = element.getBoundingClientRect();
    setNavTip({ label, x: rect.left + rect.width / 2 });
  }

  function hideNavTip() {
    if (navTipTimer.current) window.clearTimeout(navTipTimer.current);
    navTipTimer.current = window.setTimeout(() => setNavTip(null), 80);
  }

  useEffect(
    () => () => {
      if (navTipTimer.current) window.clearTimeout(navTipTimer.current);
    },
    [],
  );

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

  useEffect(() => {
    if (publicRoute || authLoading || user) return;
    router.replace("/login");
  }, [authLoading, publicRoute, router, user]);

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
    ],
    [openTransaction, router],
  );

  const today = stats?.totals.todayNet ?? 0;
  const remaining = Math.max(0, (stats?.totals.budget ?? 0) - (stats?.totals.month ?? 0));

  if (publicRoute) return <>{children}</>;
  if (authLoading || !user) return <SessionGateSkeleton />;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className={cn("flex-1 pb-40 pt-20", FRAME)}>{children}</main>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
        <button
          ref={islandRef}
          type="button"
          onClick={() => setIslandView("today")}
          onFocus={() => setIslandView("today")}
          onBlur={() => setIslandView(null)}
          onPointerEnter={() => setIslandView("today")}
          onPointerLeave={() => setIslandView(null)}
          className="pointer-events-auto cursor-pointer border-0 bg-transparent p-0"
          aria-label="Today's summary"
          aria-busy={statsLoading}
          aria-expanded={islandView === "today"}
        >
          <DynamicIsland
            view={islandView}
            compact={
              <span className="flex items-center gap-2 whitespace-nowrap px-3 text-[11px] font-medium">
                Today net
                <span className="text-white/50">·</span>
                {statsLoading ? (
                  <IslandSkeleton className="h-3 w-24" />
                ) : (
                  <>
                    <span className="text-white/60">{display.unit}</span>
                    {display.formatValue(today)}
                  </>
                )}
              </span>
            }
          >
            <DynamicIslandView id="today" className="py-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-5 whitespace-nowrap px-4 py-0">
                  <div>
                    <p className="text-[10px] text-white/60">Today net</p>
                    <p className="tnum text-sm font-semibold">
                      {statsLoading ? (
                        <IslandSkeleton className="mt-1 h-4 w-24" />
                      ) : (
                        <>
                          <span className="mr-1 text-white/60">{display.unit}</span>
                          {display.formatValue(today)}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="h-6 w-px bg-white/20" />
                  <div>
                    <p className="text-[10px] text-white/60">Left in budget</p>
                    <p className="tnum text-sm font-semibold">
                      {statsLoading ? (
                        <IslandSkeleton className="mt-1 h-4 w-24" />
                      ) : (
                        <>
                          <span className="mr-1 text-white/60">{display.unit}</span>
                          {display.formatValue(remaining)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-2 w-full border-t border-white/10 pt-1.5 text-center text-[9px] text-white/45">
                  {statsLoading ? (
                    <IslandSkeleton className="mx-auto h-2 w-20" />
                  ) : (
                    (stats?.monthLabel ?? "This month")
                  )}
                </p>
              </div>
            </DynamicIslandView>
          </DynamicIsland>
        </button>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
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
                  onPointerEnter={(event) =>
                    showNavTip(item.label, event.currentTarget)
                  }
                  onPointerLeave={hideNavTip}
                  onFocus={(event) =>
                    showNavTip(item.label, event.currentTarget)
                  }
                  onBlur={hideNavTip}
                  className={cn(
                    "grid size-8 place-items-center rounded-full transition-colors",
                    active
                      ? "bg-white/[0.16]"
                      : "bg-transparent",
                  )}
                >
                  <Icon
                    icon={item.icon}
                    className={cn("block size-[18px] transition-colors", active ? "text-white" : "text-white/55 hover:text-white")}
                  />
                </Link>
              </DockItem>
            );
          })}
          {NAV.slice(4).map((item) => {
            const active = pathname === item.href;
            return (
              <DockItem key={item.href} active={active} aria-label={item.label}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  onPointerEnter={(event) =>
                    showNavTip(item.label, event.currentTarget)
                  }
                  onPointerLeave={hideNavTip}
                  onFocus={(event) =>
                    showNavTip(item.label, event.currentTarget)
                  }
                  onBlur={hideNavTip}
                  className={cn(
                    "grid size-8 place-items-center rounded-full transition-colors",
                    active
                      ? "bg-white/[0.16]"
                      : "bg-transparent",
                  )}
                >
                  <Icon
                    icon={item.icon}
                    className={cn("block size-[18px] transition-colors", active ? "text-white" : "text-white/55 hover:text-white")}
                  />
                </Link>
              </DockItem>
            );
          })}
          <DockSeparator />
          <DockItem onClick={() => setCommandOpen(true)} aria-label="Search">
            <span className="grid size-8 place-items-center rounded-full">
              <Icon icon={Search01Icon} className="size-[18px] text-white/55 transition-colors hover:text-white" />
            </span>
          </DockItem>
          <DockItem aria-label="Toggle theme">
            <span className="grid size-8 place-items-center rounded-full">
              <ThemeToggle
                variant="circle-blur"
                className="size-8 rounded-full text-white/60 transition-colors hover:text-white"
                iconClassName="size-[18px]"
              />
            </span>
          </DockItem>
        </Dock>

        <AnimatePresence>
          {navTip ? (
            <motion.div
              initial={{ opacity: 0, y: 4, x: navTip.x }}
              animate={{ opacity: 1, y: 0, x: navTip.x }}
              exit={{ opacity: 0, y: 4 }}
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 42,
                mass: 0.5,
              }}
              className="pointer-events-none fixed bottom-[70px] left-0 z-[60]"
            >
              <div className="min-w-[88px] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/95 px-3 py-1.5 text-center text-[11px] font-medium text-white/90 shadow-xl backdrop-blur-md">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={navTip.label}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="block whitespace-nowrap"
                  >
                    {navTip.label}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <CommandPalette items={commands} open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
