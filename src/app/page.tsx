"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { AuthDialog } from "@/components/auth-dialog";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => {
    // Post-hydration only: the query string is not available during prerender.
    if (new URLSearchParams(window.location.search).get("auth") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthOpen(true);
    }
  }, []);

  return (
    <div className="theme-light flex h-dvh flex-col overflow-hidden bg-[oklch(0.165_0.008_285)] text-foreground">


      <main className="min-h-0 flex-1 px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <div
          className={cn(
            "mx-auto flex h-full w-full max-w-[1500px] flex-col gap-4 transition-[gap] duration-700 lg:flex-row",
            pricingOpen ? "lg:gap-4" : "lg:gap-0",
          )}
        >
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            className="relative isolate min-w-0 flex-1 overflow-hidden rounded-[32px] bg-black"
          >
            <Image
              src="/bg-hero.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-center"
            />

            <div className="relative flex h-full flex-col px-6 pt-8 sm:px-10 lg:px-12">
              <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
                <Link
                  href="/"
                  style={{ fontFamily: "var(--font-syncopate), system-ui, sans-serif" }}
                  className="whitespace-nowrap font-syncopate text-[13px] font-bold tracking-[0.04em] text-white/90 sm:text-sm"
                >
                  Expense Trackr
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className={buttonVariants({
                      className:
                        "justify-center bg-gradient-to-r from-lime-200 via-emerald-300 to-green-400 [background-size:200%_100%] [background-position:0%_50%] px-3 text-black shadow-lg shadow-emerald-500/20 transition-[background-position,filter] duration-500 hover:[background-position:100%_50%] hover:brightness-105",
                    })}
                  >
                    <span className="inline-flex items-center gap-2">
                      Open App
                      <Icon icon={ArrowRight01Icon} className="size-4" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingOpen((open) => !open)}
                    aria-expanded={pricingOpen}
                    aria-controls="landing-pricing"
                    className={buttonVariants({
                      variant: "outline",
                      className:
                        "justify-center border-white/25 bg-white/5 px-3 text-white hover:bg-white/10",
                    })}
                  >
                    {pricingOpen ? "Hide pricing" : "View pricing"}
                  </button>
                </div>
              </div>

              <div className="mx-auto mt-auto w-full max-w-4xl pb-4">
                <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-10">
                  <div>
                    <h1 className="font-display text-2xl leading-tight tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.45)] sm:text-3xl">
                      Know where
                      <span className="block text-white/70">every shilling goes.</span>
                    </h1>
                  </div>

                  <p className="max-w-sm text-[15px] leading-relaxed text-white/70 [text-shadow:0_1px_14px_rgba(0,0,0,0.5)]">
                    Accounts, spending, budgets, goals and debts in one
                    workspace, so the month adds up without a spreadsheet.
                  </p>
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
          </motion.section>

          {pricingOpen ? (
            <button
              type="button"
              aria-label="Close pricing"
              onClick={() => setPricingOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
            />
          ) : null}

          <div
            id="landing-pricing"
            inert={!pricingOpen}
            className={cn(
              "min-h-0 shrink-0 overflow-hidden transition-[width,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
              pricingOpen
                ? "fixed inset-4 z-50 h-[calc(100dvh-2rem)] w-auto opacity-100 lg:static lg:inset-auto lg:h-auto lg:w-[34%]"
                : "pointer-events-none w-0 opacity-0",
            )}
          >
          <motion.aside
            initial={false}
            animate={{ x: pricingOpen ? 0 : 48, opacity: pricingOpen ? 1 : 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            className="relative flex h-full min-h-0 w-full flex-col overflow-y-auto rounded-[32px] border border-white/10 bg-white/[0.035] p-6 transition-colors hover:border-white/20 lg:p-8"
          >
            <button
              type="button"
              aria-label="Close pricing"
              onClick={() => setPricingOpen(false)}
              className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon icon={Cancel01Icon} className="size-4" />
            </button>
            <div className="mx-auto flex h-full w-full max-w-sm flex-col text-center">
            <div className="flex flex-1 flex-col justify-center">
            {/*<p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">
              Simple pricing
            </p>*/}
            <h2
              className="mt-4 inline-block font-display text-7xl leading-[0.85] tracking-[-0.06em] sm:text-8xl"
              style={{
                backgroundImage:
                  "linear-gradient(100deg, #d9f99d 0%, #4ade80 45%, #22c55e 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
            >
              Free
            </h2>
            <p className="mx-auto mt-5 max-w-[18rem] text-sm leading-relaxed text-white/55">
              Every feature, every account, every currency. One workspace with
              nothing to unlock.
            </p>
            {/*<div className="mx-auto mt-7 flex w-full max-w-[16rem] items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-white/40">
              <span className="h-px flex-1 bg-white/10" />
              Everything included
              <span className="h-px flex-1 bg-white/10" />
            </div>*/}
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className={buttonVariants({
                className:
                  "mx-auto mt-8 cursor-pointer justify-center px-3",
              })}
            >
              <span className="relative inline-flex items-center">
                Open the App
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={{ scaleX: pricingOpen ? 1 : 0 }}
                  transition={{
                    duration: 0.65,
                    delay: pricingOpen ? 0.35 : 0,
                    ease: EASE_OUT,
                  }}
                  className="absolute -bottom-1 left-0 h-px w-full origin-left bg-current"
                />
              </span>
            </button>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-center gap-3 pt-6">
              <span
                style={{ fontFamily: "var(--font-syncopate), system-ui, sans-serif" }}
                className="font-syncopate text-[11px] tracking-[0.02em] text-white/70"
              >
                Expense Trackr
              </span>
              <span className="h-4 w-px bg-white/15" />
              <a
                href="https://salastores.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SalaStores"
                className="group inline-flex items-center gap-3"
              >
                <Image
                  src="/salastores-logo.svg"
                  alt=""
                  width={30}
                  height={28}
                  className="opacity-60 pb-1 transition-opacity group-hover:opacity-100"
                />
                <span
                  style={{ fontFamily: "var(--font-syncopate), system-ui, sans-serif" }}
                  className="font-syncopate text-[11px] tracking-[0.02em] text-white/70 transition-colors group-hover:text-white"
                >
                  <span className="text-purple-400">Sala</span>Stores
                </span>
              </a>
            </div>
            </div>
          </motion.aside>
          </div>
        </div>
      </main>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
