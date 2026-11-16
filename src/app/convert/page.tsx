"use client";

import { ArrowLeftRightIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { MultiChainSwap, type Chain, type Token } from "@/components/motion/swap";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { Panel, PanelHeader } from "@/components/panel";
import { useApi } from "@/lib/use-api";
import { formatNumber } from "@/lib/format";
import type { Stats } from "@/lib/types";

type Fx = { pair: string; rate: number; source: string; updatedAt: string };

const CHAINS: Chain[] = [
  { id: "cash", name: "Cash", tone: "bg-primary text-primary-foreground", symbol: "S" },
];

export default function ConvertPage() {
  const { data: fx } = useApi<Fx>("/api/fx");
  const { data: stats } = useApi<Stats>("/api/stats");

  const rate = fx?.rate ?? 3720;
  const tokens: Token[] = [
    {
      id: "ugx",
      symbol: "UGX",
      name: "Ugandan Shilling",
      chainId: "cash",
      balance: stats?.forecast.liquidBalanceUgx ?? 0,
      usd: 1 / rate,
      popular: true,
    },
    {
      id: "usd",
      symbol: "USD",
      name: "US Dollar",
      chainId: "cash",
      balance: Math.round((stats?.forecast.liquidBalanceUgx ?? 0) / rate),
      usd: 1,
      popular: true,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[13px] text-muted-foreground">Converter</p>
        <h1 className="mt-2 font-display text-5xl leading-none md:text-[56px]">UGX to USD.</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Flip between shillings and dollars at the rate stored with each expense.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6 xl:col-span-5">
          <MultiChainSwap
            chains={CHAINS}
            tokens={tokens}
            defaultFromId="ugx"
            defaultToId="usd"
            labels={{
              title: "Convert",
              swapTokens: "Convert {from} to {to}",
              swapAndSend: "Convert {from} to {to}",
              networkFee: "Bank spread",
              slippage: "Rate buffer",
              eta: "Stale after",
              sendToOther: "Lock the rate",
              insufficient: "Not enough {symbol}",
            }}
          />
        </div>

        <div className="col-span-12 space-y-5 lg:col-span-6 xl:col-span-7">
          <Panel className="p-6">
            <PanelHeader
              title="Exchange rate"
              hint={
                fx
                  ? `Updated ${new Date(fx.updatedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Mock feed"
              }
              action={
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Icon icon={Refresh01Icon} className="size-3" /> {fx?.source ?? "mock"}
                </span>
              }
              className="p-0"
            />
            <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-5">
              <div>
                <p className="text-xs text-muted-foreground">1 USD buys</p>
                <p className="tnum mt-1.5 font-display text-4xl leading-none">
                  <AnimatedNumber value={rate} startOnView={false} format={(n) => formatNumber(n)} />
                  <span className="ml-1.5 font-sans text-xs font-medium text-muted-foreground">UGX</span>
                </p>
              </div>
              <Icon icon={ArrowLeftRightIcon} className="mb-2 size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">1,000 UGX buys</p>
                <p className="tnum mt-1.5 font-display text-4xl leading-none">
                  <span className="mr-1 font-sans text-xs font-medium text-muted-foreground">USD</span>
                  {(1000 / rate).toFixed(3)}
                </p>
              </div>
            </div>
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel className="p-5">
              <p className="text-[13px] text-muted-foreground">This month, in USD</p>
              <p className="tnum mt-2 font-display text-3xl leading-none">
                <AnimatedNumber
                  value={stats?.totals.usd ?? 0}
                  startOnView={false}
                  format={(n) => formatNumber(n)}
                />
                <span className="ml-1.5 font-sans text-xs font-medium text-muted-foreground">USD</span>
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                from {stats?.totals.count ?? 0} entries
              </p>
            </Panel>
            <Panel className="p-5">
              <p className="text-[13px] text-muted-foreground">Budget, in USD</p>
              <p className="tnum mt-2 font-display text-3xl leading-none">
                <AnimatedNumber
                  value={Math.round((stats?.totals.budget ?? 0) / rate)}
                  startOnView={false}
                  format={(n) => formatNumber(n)}
                />
                <span className="ml-1.5 font-sans text-xs font-medium text-muted-foreground">USD</span>
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {formatNumber(stats?.totals.budget ?? 0)} UGX
              </p>
            </Panel>
          </div>

          <Panel className="p-6">
            <PanelHeader title="Quick conversions" hint="At today's rate" className="p-0 pb-4" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[5000, 10000, 20000, 50000].map((amount) => (
                <div key={amount} className="rounded-xl border border-border/70 p-3">
                  <Money value={amount} size="sm" />
                  <p className="tnum mt-2 text-lg font-semibold">
                    <span className="mr-1 text-[10px] font-medium text-muted-foreground">USD</span>
                    {(amount / rate).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
