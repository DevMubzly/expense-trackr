"use client";

import { ArrowLeftRight, RefreshCcw } from "lucide-react";
import { MultiChainSwap, type Chain, type Token } from "@/components/motion/swap";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Panel, PanelHeader } from "@/components/panel";
import { useApi } from "@/lib/use-api";
import { formatNumber } from "@/lib/format";
import type { Stats } from "@/lib/types";

type Fx = { pair: string; rate: number; source: string; updatedAt: string };

const CHAINS: Chain[] = [
  { id: "cash", name: "Cash", tone: "bg-primary text-primary-foreground", symbol: "₦" },
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
      balance: stats?.totals.month ?? 0,
      usd: 1 / rate,
      popular: true,
    },
    {
      id: "usd",
      symbol: "USD",
      name: "US Dollar",
      chainId: "cash",
      balance: stats?.totals.usd ?? 0,
      usd: 1,
      popular: true,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Converter</p>
        <h1 className="mt-1 font-display text-5xl leading-none md:text-6xl">UGX ⇄ USD.</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
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
              swapTokens: "Convert {from} → {to}",
              swapAndSend: "Convert {from} → {to}",
              networkFee: "Bank spread",
              slippage: "Rate buffer",
              eta: "Stale after",
              sendToOther: "Lock the rate",
              insufficient: "Not enough {symbol}",
            }}
          />
        </div>

        <div className="col-span-12 space-y-4 lg:col-span-6 xl:col-span-7">
          <Panel className="p-6">
            <PanelHeader
              title="Rate"
              hint={fx ? `Updated ${new Date(fx.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Mock feed"}
              action={
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <RefreshCcw className="size-3" /> {fx?.source ?? "mock"}
                </span>
              }
              className="p-0"
            />
            <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">1 USD buys</p>
                <p className="tnum mt-1 font-display text-4xl leading-none">
                  <AnimatedNumber value={rate} startOnView={false} format={(n) => formatNumber(n)} />
                  <span className="ml-1 font-sans text-xs text-muted-foreground">UGX</span>
                </p>
              </div>
              <ArrowLeftRight className="mb-2 size-5 text-muted-foreground" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">1,000 UGX buys</p>
                <p className="tnum mt-1 font-display text-4xl leading-none">
                  ${(1000 / rate).toFixed(3)}
                </p>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="p-5">
              <PanelHeader title="This month, in USD" className="p-0 pb-3" />
              <p className="tnum font-display text-3xl">
                ${formatNumber(stats?.totals.usd ?? 0)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                from {stats?.totals.count ?? 0} entries
              </p>
            </Panel>
            <Panel className="p-5">
              <PanelHeader title="Budget, in USD" className="p-0 pb-3" />
              <p className="tnum font-display text-3xl">
                ${formatNumber(Math.round((stats?.totals.budget ?? 0) / rate))}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatNumber(stats?.totals.budget ?? 0)} UGX
              </p>
            </Panel>
          </div>

          <Panel className="p-5">
            <PanelHeader title="Quick maths" hint="Handy conversions at today's rate" className="p-0 pb-3" />
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[5000, 10000, 20000, 50000].map((amount) => (
                <div key={amount} className="rounded-xl border border-border/70 bg-card/40 p-3">
                  <p className="tnum text-xs text-muted-foreground">{formatNumber(amount)} UGX</p>
                  <p className="tnum mt-1 font-display text-xl">${(amount / rate).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
