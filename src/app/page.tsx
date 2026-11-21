"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { AuthDialog } from "@/components/auth-dialog";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    // Post-hydration only: the query string is not available during prerender.
    if (new URLSearchParams(window.location.search).get("auth") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthOpen(true);
    }
  }, []);

  return (
    <div className="theme-light flex h-dvh flex-col overflow-hidden bg-[oklch(0.165_0.008_285)] text-foreground">
      <header className="mx-auto flex w-full max-w-[1500px] items-center px-4 py-5 sm:px-6">
        <Link href="/" className="font-syncopate text-[11px] font-bold tracking-[0.04em] text-white">
          Expense Trackr
        </Link>
      </header>

      <main className="min-h-0 flex-1 px-4 pb-4 sm:px-6">
        <div className="mx-auto grid h-full w-full max-w-[1500px] gap-4 lg:grid-cols-[1.55fr_1fr]">
          <section className="relative isolate overflow-hidden rounded-[32px] bg-black">
            <Image
              src="/bg-hero.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-center"
            />

            <div className="relative flex h-full flex-col px-6 pt-10 sm:px-10 lg:px-12">
              <div className="mx-auto mt-auto max-w-2xl pb-4 text-center">
                <h1 className="font-display text-2xl leading-tight tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.45)] sm:text-3xl">
                  Know where
                  <span className="block text-white/70">every shilling goes.</span>
                </h1>

                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70 [text-shadow:0_1px_14px_rgba(0,0,0,0.5)]">
                  Accounts, spending, budgets, goals and debts in one workspace,
                  so the month adds up without a spreadsheet.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className={buttonVariants({
                      size: "lg",
                      className:
                        "h-9 w-40 justify-center bg-white px-4 text-black hover:bg-white/90",
                    })}
                  >
                    Open App
                    <Icon icon={ArrowRight01Icon} className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center overflow-hidden">
                <Image
                  src="/dash.png"
                  alt="Expense Trackr dashboard"
                  width={1920}
                  height={956}
                  priority
                  className="h-auto w-full max-w-6xl rounded-t-2xl border-x-[5px] border-t-[5px] border-white/45 shadow-2xl shadow-black/40"
                />
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-y-auto rounded-[32px] border border-white/10 bg-white/[0.035] p-6 lg:p-8">
            <div className="mx-auto flex h-full w-full max-w-sm flex-col text-center">
            <div className="flex flex-1 flex-col justify-center">
            <h2 className="font-display text-2xl leading-tight tracking-[-0.03em] text-white">
              One plan. Everything in.
            </h2>

            <div className="mt-6 flex items-baseline gap-2 text-white">
              <span className="text-lg font-medium text-white/60">UGX</span>
              <span className="font-display text-5xl leading-none tracking-[-0.04em]">
                4,000
              </span>
              <span className="text-sm text-white/50">per month</span>
            </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-center gap-3 pt-6">
              <span className="font-syncopate text-[11px] tracking-[0.02em] text-white/70">
                Expense Trackr
              </span>
              <span className="h-4 w-px bg-white/15" />
              <Image
                src="/salastores-logo.svg"
                alt=""
                width={30}
                height={28}
                className="opacity-60"
              />
              <span className="font-syncopate text-[11px] tracking-[0.02em] text-white/70">
                <span className="text-purple-400">Sala</span>Stores
              </span>
            </div>
            </div>
          </aside>
        </div>
      </main>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
